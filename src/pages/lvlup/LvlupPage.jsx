import { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, postJson } from '../../lib/api.js';
import { getDefaultAppPathForUser, isMaestroLvlupRole, isNavKeyEnabled } from '../../lib/navFeatures.js';
import {
  etiquetaPaquete,
  horasPermitidasOpciones,
  TIPOS_REGISTRO_LVLUP,
  textoSaldoParticipante,
  tipoRegistroDisponible,
} from '../../lib/lvlupHoras.js';
import { LvlupComentarioModal } from '../../components/lvlup/LvlupComentarioModal.jsx';
import { LvlupHistorialTab } from '../../components/lvlup/LvlupHistorialTab.jsx';

function resumenAsignacion(a) {
  const asig = a.nombre_asignatura || `Asignatura ${a.id_asignatura}`;
  const sede = a.sede || '';
  const sesion = a.sesion === 'Grupal' ? a.grupo_nombre || 'Grupo' : 'Individual';
  return { asig, sede, sesion };
}

export function LvlupPage() {
  const { user } = useOutletContext() || {};
  const queryClient = useQueryClient();
  const navEnabled = isNavKeyEnabled('lvlup');
  const isAdmin = String(user?.rol || '') === 'Administrador';
  const isMaestroLvlup = isMaestroLvlupRole(user);
  const canAccess = navEnabled || isAdmin || isMaestroLvlup;

  const [vista, setVista] = useState('registrar');
  const [maestroId, setMaestroId] = useState('');
  const [asignacionId, setAsignacionId] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState(null);
  const [horas, setHoras] = useState(null);
  const [pasoGrupal, setPasoGrupal] = useState(1);
  const [marcas, setMarcas] = useState({});
  const [comentarios, setComentarios] = useState({});
  const [comentarioModal, setComentarioModal] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), type === 'danger' ? 3200 : 2600);
  };

  const maestrosQuery = useQuery({
    queryKey: ['lvlup-maestros'],
    queryFn: () => getJson('/api/lvlup/maestros'),
    enabled: canAccess && isAdmin,
    staleTime: 5 * 60_000,
  });

  const asignacionesQuery = useQuery({
    queryKey: ['lvlup-asignaciones', maestroId || 'all'],
    queryFn: () => {
      const params = new URLSearchParams();
      if (maestroId) params.set('maestroId', maestroId);
      const qs = params.toString();
      return getJson(qs ? `/api/lvlup/asignaciones?${qs}` : '/api/lvlup/asignaciones');
    },
    enabled: canAccess,
    staleTime: 2 * 60_000,
  });

  const asignaciones = asignacionesQuery.data?.asignaciones || [];
  const asignacionSel = useMemo(
    () => asignaciones.find((a) => String(a.asignacion_id) === String(asignacionId)),
    [asignaciones, asignacionId],
  );

  const participantesQuery = useQuery({
    queryKey: ['lvlup-participantes', asignacionId],
    queryFn: () => getJson(`/api/lvlup/asignaciones/${asignacionId}/participantes`),
    enabled: Boolean(asignacionId),
    staleTime: 90_000,
  });

  const participantes = participantesQuery.data?.participantes || [];
  const esGrupal = asignacionSel?.sesion === 'Grupal';

  const horasOpciones = useMemo(
    () => horasPermitidasOpciones(participantes, tipoRegistro, esGrupal),
    [participantes, tipoRegistro, esGrupal],
  );

  const tiposDisponibles = useMemo(() => {
    if (!participantes.length) return TIPOS_REGISTRO_LVLUP;
    const ref = esGrupal ? participantes : participantes.slice(0, 1);
    return TIPOS_REGISTRO_LVLUP.filter((t) =>
      ref.some((p) => tipoRegistroDisponible(p, t.id)),
    );
  }, [participantes, esGrupal]);

  useEffect(() => {
    setPasoGrupal(1);
    setMarcas({});
    setComentarios({});
    setTipoRegistro(null);
    setHoras(null);
  }, [asignacionId]);

  useEffect(() => {
    if (horas != null && !horasOpciones.includes(horas)) setHoras(null);
  }, [horas, horasOpciones]);

  useEffect(() => {
    if (tipoRegistro && !tiposDisponibles.some((t) => t.id === tipoRegistro)) {
      setTipoRegistro(null);
    }
  }, [tipoRegistro, tiposDisponibles]);

  const guardarMutation = useMutation({
    mutationFn: (body) => {
      const path = esGrupal ? '/api/lvlup/asistencia/grupal' : '/api/lvlup/asistencia/individual';
      return postJson(path, body);
    },
    onSuccess: () => {
      showToast('success', 'Sesión registrada. Horas descontadas del paquete.');
      queryClient.invalidateQueries({ queryKey: ['lvlup-participantes', asignacionId] });
      queryClient.invalidateQueries({ queryKey: ['lvlup-historial'] });
      setMarcas({});
      setTipoRegistro(null);
      setHoras(null);
      if (esGrupal) setPasoGrupal(1);
    },
    onError: (err) => {
      showToast('danger', err?.message || 'No se pudo guardar');
    },
  });

  const validarAntesGuardar = () => {
    if (!tipoRegistro) {
      showToast('danger', 'Selecciona el tipo de registro.');
      return false;
    }
    if (!horas) {
      showToast('danger', 'Selecciona las horas de la sesión.');
      return false;
    }
    if (esGrupal) {
      const sinMarcar = participantes.filter((p) => marcas[p.documento] === undefined);
      if (sinMarcar.length) {
        showToast('danger', 'Marca Asistió o Faltó para cada alumno antes de guardar.');
        return false;
      }
    }
    return true;
  };

  const onGuardar = () => {
    if (!asignacionId || !validarAntesGuardar()) return;

    if (esGrupal) {
      guardarMutation.mutate({
        asignacionId: Number(asignacionId),
        horasSesion: horas,
        tipoRegistro,
        asistencia: participantes.map((p) => ({
          documento: p.documento,
          asistio: marcas[p.documento] === true,
          comentarios: comentarios[p.documento] || null,
        })),
      });
      return;
    }

    const alumno = participantes[0];
    guardarMutation.mutate({
      asignacionId: Number(asignacionId),
      horas,
      tipoRegistro,
      comentarios: alumno ? comentarios[alumno.documento] || null : null,
    });
  };

  const onContinuarGrupal = () => {
    if (!tipoRegistro) {
      showToast('danger', 'Selecciona el tipo de registro.');
      return;
    }
    if (!horas) {
      showToast('danger', 'Selecciona las horas de esta sesión.');
      return;
    }
    setPasoGrupal(2);
  };

  if (!canAccess) {
    return <Navigate to={getDefaultAppPathForUser(user)} replace />;
  }

  const marcasCompletas =
    !esGrupal ||
    (participantes.length > 0 && participantes.every((p) => marcas[p.documento] !== undefined));

  return (
    <div className="att-main att-lvlup-page">
      <header className="att-lvlup-page__head">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h2 className="h5 fw-bold att-lvlup-page__title mb-0">LVL UP</h2>
          <div className="att-tabs att-lvlup-page__tabs">
            <button
              type="button"
              className={`att-tab-btn ${vista === 'registrar' ? 'is-active' : ''}`}
              onClick={() => setVista('registrar')}
            >
              Registrar
            </button>
            <button
              type="button"
              className={`att-tab-btn ${vista === 'historial' ? 'is-active' : ''}`}
              onClick={() => setVista('historial')}
            >
              Historial
            </button>
          </div>
        </div>
        {vista === 'registrar' ? (
          <span className="att-lvlup-periodo" title="Paquetes activos por asignación de AppSheet">
            Asignaciones activas
          </span>
        ) : null}
      </header>

      {vista === 'historial' ? (
        <LvlupHistorialTab
          isAdmin={isAdmin}
          maestros={maestrosQuery.data?.maestros || []}
          asignaciones={asignaciones}
        />
      ) : (
        <>
      {isAdmin ? (
        <section className="att-admin-filters card border-0 shadow-sm att-lvlup-filters">
          <div className="card-body py-2 px-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1 att-admin-filter-label">Maestro</label>
                <select
                  className="form-select form-select-sm"
                  value={maestroId}
                  onChange={(e) => {
                    setMaestroId(e.target.value);
                    setAsignacionId('');
                  }}
                >
                  <option value="">Todos los maestros</option>
                  {(maestrosQuery.data?.maestros || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="att-lvlup-layout">
        <aside className="att-lvlup-aside">
          <div className="att-lvlup-aside__head">
            <h3>{isAdmin ? 'Asignaciones' : 'Mis asignaciones'}</h3>
            <p className="small text-muted mb-0">
              {asignacionesQuery.isLoading
                ? 'Cargando…'
                : `${asignaciones.length} activa${asignaciones.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {asignacionesQuery.isError ? (
            <p className="small text-danger mb-0">
              {asignacionesQuery.error?.message || 'Error al cargar'}
            </p>
          ) : null}

          {!asignacionesQuery.isLoading && asignaciones.length === 0 ? (
            <p className="small text-muted mb-0">
              No hay asignaciones activas. Verifica en AppSheet que exista{' '}
              <strong>asignacion_lvlup</strong> con estado ACTIVO.
            </p>
          ) : null}

          <div className="att-lvlup-asignacion-list">
            {asignaciones.map((a) => {
              const { asig, sede, sesion } = resumenAsignacion(a);
              const active = String(a.asignacion_id) === String(asignacionId);
              const paquete = etiquetaPaquete(a);
              return (
                <button
                  key={a.asignacion_id}
                  type="button"
                  className={`att-lvlup-asignacion-item ${active ? 'is-active' : ''}`}
                  onClick={() => setAsignacionId(String(a.asignacion_id))}
                >
                  <p className="att-lvlup-asignacion-item__title">{asig}</p>
                  <p className="att-lvlup-asignacion-item__meta">
                    {isAdmin && a.maestro_nombre ? `${a.maestro_nombre} · ` : ''}
                    {sesion} · {sede}
                    {a.nivel === 2 ? ' · Nivel 2' : ''}
                  </p>
                  <div className="att-lvlup-asignacion-item__tags">
                    <span
                      className={`att-lvlup-tag ${
                        a.sesion === 'Grupal' ? 'att-lvlup-tag--grupal' : 'att-lvlup-tag--individual'
                      }`}
                    >
                      {a.sesion}
                    </span>
                    <span className="att-lvlup-tag">{paquete}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="att-lvlup-panel">
          {!asignacionId ? (
            <div className="att-lvlup-panel__empty">
              <strong>Selecciona una asignación</strong>
              <span className="small">
                Las horas se descuentan del paquete al registrar la sesión, asistencia o falta.
              </span>
            </div>
          ) : (
            <>
              <div className="att-lvlup-panel__scroll">
                {esGrupal ? (
                  <div className="att-lvlup-steps">
                    <div
                      className={`att-lvlup-step ${pasoGrupal >= 1 ? 'is-active' : ''} ${pasoGrupal > 1 ? 'is-done' : ''}`}
                    >
                      1 · Horas de la sesión
                    </div>
                    <div className={`att-lvlup-step ${pasoGrupal >= 2 ? 'is-active' : ''}`}>
                      2 · Asistencia del grupo
                    </div>
                  </div>
                ) : null}

                {(!esGrupal || pasoGrupal === 1) && (
                  <>
                    <div className="att-lvlup-section">
                      <span className="att-lvlup-field-label">Tipo de registro</span>
                      <div className="att-lvlup-pills">
                        {TIPOS_REGISTRO_LVLUP.map((t) => {
                          const ok = tiposDisponibles.some((x) => x.id === t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!ok}
                              className={`att-lvlup-pill ${tipoRegistro === t.id ? 'is-active' : ''}`}
                              onClick={() => setTipoRegistro(t.id)}
                              title={
                                !ok
                                  ? esGrupal
                                    ? 'Tope agotado (Dx/Informe: máx 2h grupal)'
                                    : 'Tope agotado (Dx/Informe: máx 1h individual)'
                                  : undefined
                              }
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="att-lvlup-section">
                      <span className="att-lvlup-field-label">
                        {esGrupal
                          ? 'Horas de esta sesión (se descuentan de cada alumno marcado)'
                          : 'Horas de la sesión'}
                      </span>
                      <div className="att-lvlup-pills">
                        {horasOpciones.map((h) => (
                          <button
                            key={h}
                            type="button"
                            className={`att-lvlup-pill ${horas === h ? 'is-active' : ''}`}
                            onClick={() => setHoras(h)}
                          >
                            {h} h
                          </button>
                        ))}
                      </div>
                      {tipoRegistro && horasOpciones.length === 0 ? (
                        <p className="small text-warning mt-2 mb-0">
                          No quedan horas disponibles para este tipo de registro.
                        </p>
                      ) : null}
                    </div>

                    {esGrupal ? (
                      <p className="small text-muted mb-0">
                        Al marcar asistencia, las horas se restan del paquete de cada alumno,
                        haya asistido o faltado.
                      </p>
                    ) : null}
                  </>
                )}

                {esGrupal && pasoGrupal === 2 ? (
                  <>
                    {participantesQuery.isLoading ? (
                      <p className="small text-muted">Cargando participantes…</p>
                    ) : null}
                    {!participantesQuery.isLoading && participantes.length === 0 ? (
                      <p className="small text-warning">No hay alumnos en este grupo.</p>
                    ) : null}
                    <div className="att-lvlup-participants-grid">
                      {participantes.map((p) => {
                        const marca = marcas[p.documento];
                        const comentario = comentarios[p.documento] || '';
                        const saldoTxt = textoSaldoParticipante(p);
                        return (
                          <article key={p.documento} className="att-lvlup-participant-card">
                            <div className="att-lvlup-participant-card__accent" aria-hidden="true" />
                            <div className="att-lvlup-participant-card__body">
                              <p className="att-lvlup-participant-card__name">
                                {p.nombre || p.documento}
                              </p>
                              <p className="att-lvlup-participant-card__doc">{p.documento}</p>
                              {saldoTxt ? (
                                <p className="att-lvlup-participant-card__doc text-primary fw-semibold">
                                  {saldoTxt}
                                </p>
                              ) : null}
                              {comentario ? (
                                <div
                                  className="att-lvlup-participant-card__comentario"
                                  title={comentario}
                                >
                                  <strong>Nota:</strong> {comentario}
                                </div>
                              ) : null}
                            </div>
                            <div className="att-lvlup-participant-card__actions">
                              <div className="att-lvlup-participant-card__actions-row">
                                <button
                                  type="button"
                                  className={`att-act att-act--asistio ${marca === true ? 'att-act--active' : ''}`}
                                  onClick={() =>
                                    setMarcas((prev) => ({ ...prev, [p.documento]: true }))
                                  }
                                >
                                  Asistió
                                </button>
                                <button
                                  type="button"
                                  className={`att-act att-act--falto ${marca === false ? 'att-act--active' : ''}`}
                                  onClick={() =>
                                    setMarcas((prev) => ({ ...prev, [p.documento]: false }))
                                  }
                                >
                                  Faltó
                                </button>
                              </div>
                              <div className="att-lvlup-participant-card__actions-row">
                                <button
                                  type="button"
                                  className={`att-act att-act--comentario ${comentario ? 'att-act--active' : ''}`}
                                  onClick={() =>
                                    setComentarioModal({
                                      documento: p.documento,
                                      nombre: p.nombre || p.documento,
                                    })
                                  }
                                >
                                  Comentario
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {!esGrupal ? (
                  <>
                    {participantesQuery.isLoading ? (
                      <p className="small text-muted">Cargando alumno…</p>
                    ) : null}
                    {participantes[0] ? (
                      <article className="att-lvlup-individual-card">
                        <div className="att-lvlup-participant-card__accent" aria-hidden="true" />
                        <div className="att-lvlup-participant-card__body">
                          <p className="att-lvlup-participant-card__name">
                            {participantes[0].nombre || participantes[0].documento}
                          </p>
                          <p className="att-lvlup-participant-card__doc">
                            {participantes[0].documento}
                          </p>
                          {textoSaldoParticipante(participantes[0]) ? (
                            <p className="att-lvlup-participant-card__doc text-primary fw-semibold">
                              {textoSaldoParticipante(participantes[0])}
                            </p>
                          ) : null}
                          {comentarios[participantes[0].documento] ? (
                            <div
                              className="att-lvlup-participant-card__comentario"
                              title={comentarios[participantes[0].documento]}
                            >
                              <strong>Nota:</strong> {comentarios[participantes[0].documento]}
                            </div>
                          ) : null}
                        </div>
                        <div className="att-lvlup-participant-card__actions">
                          <button
                            type="button"
                            className={`att-act att-act--comentario ${
                              comentarios[participantes[0].documento] ? 'att-act--active' : ''
                            }`}
                            onClick={() =>
                              setComentarioModal({
                                documento: participantes[0].documento,
                                nombre: participantes[0].nombre || participantes[0].documento,
                              })
                            }
                          >
                            Comentario
                          </button>
                        </div>
                      </article>
                    ) : (
                      <p className="small text-warning">No hay alumno en esta asignación.</p>
                    )}
                  </>
                ) : null}
              </div>

              {esGrupal && pasoGrupal === 1 ? (
                <div className="att-lvlup-save-bar">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!tipoRegistro || !horas}
                    onClick={onContinuarGrupal}
                  >
                    Continuar a asistencia
                  </button>
                </div>
              ) : null}

              {esGrupal && pasoGrupal === 2 ? (
                <div className="att-lvlup-save-bar">
                  <span className="att-lvlup-hint">
                    {marcasCompletas
                      ? 'Listo para guardar'
                      : 'Marca cada alumno antes de guardar'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setPasoGrupal(1)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={guardarMutation.isPending || !participantes.length || !marcasCompletas}
                    onClick={onGuardar}
                  >
                    {guardarMutation.isPending ? 'Guardando…' : 'Guardar sesión'}
                  </button>
                </div>
              ) : null}

              {!esGrupal ? (
                <div className="att-lvlup-save-bar">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      guardarMutation.isPending ||
                      !participantes.length ||
                      !tipoRegistro ||
                      !horas
                    }
                    onClick={onGuardar}
                  >
                    {guardarMutation.isPending ? 'Guardando…' : 'Guardar sesión'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
        </>
      )}

      <LvlupComentarioModal
        open={Boolean(comentarioModal)}
        participantName={comentarioModal?.nombre}
        initialText={comentarioModal ? comentarios[comentarioModal.documento] || '' : ''}
        onClose={() => setComentarioModal(null)}
        onConfirm={(text) => {
          if (comentarioModal) {
            setComentarios((prev) => ({
              ...prev,
              [comentarioModal.documento]: text,
            }));
          }
          setComentarioModal(null);
        }}
      />

      {toast.show ? (
        <div
          className={`att-toast att-toast--${toast.type === 'danger' ? 'error' : 'success'}`}
          role="status"
        >
          <div className="att-toast__icon" aria-hidden="true">
            {toast.type === 'danger' ? '!' : '✓'}
          </div>
          <p className="att-toast__text">{toast.message}</p>
          <button
            type="button"
            className="att-toast__close"
            aria-label="Cerrar"
            onClick={() => setToast((t) => ({ ...t, show: false }))}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
