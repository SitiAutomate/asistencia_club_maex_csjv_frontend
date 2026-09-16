import { Fragment, useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, putJson, postJson, deleteJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isAdminLike, isNavKeyEnabled, isSuperAdmin } from '../../lib/navFeatures.js';
import { formatFechaHora } from '../../lib/formatDate.js';
import { humanizeLabel } from '../../lib/gestionFormat.js';
import { GestionNav } from '../../components/gestion/GestionNav.jsx';
import { GestionPanel, GestionPanelModeToggle } from '../../components/gestion/GestionPanel.jsx';
import { SearchableSelect } from '../../components/gestion/SearchableSelect.jsx';
import { AttToast, useAttToast } from '../../components/AttToast.jsx';

const LABEL_CAMPO = {
  estado: 'Estado',
  sede: 'Sede',
  transporte: 'Transporte',
  mes: 'Mes',
  anio: 'Año',
  observaciones: 'Observaciones',
  observacionFacturacion: 'Obs. facturación',
  causalRetiro: 'Causal retiro',
  fechaRetiro: 'Fecha retiro',
  fechaRetiroTransporte: 'Fecha retiro transporte',
  fechaIngresoNuevoTransporte: 'Fecha ingreso transporte',
  idCurso: 'ID curso',
  documentoParticipante: 'Documento participante',
  documentoResponsable: 'Documento responsable',
  nombreCurso: 'Curso',
  tipo: 'Tipo',
};

function labelCampo(key) {
  return LABEL_CAMPO[key] || humanizeLabel(key);
}

function fmtAuditVal(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function extractCambios(evento) {
  if (Array.isArray(evento?.despues?.cambios)) return evento.despues.cambios;
  if (Array.isArray(evento?.cambios)) return evento.cambios;
  const antes = evento?.antes;
  const despues = evento?.despues;
  if (!antes || !despues || typeof antes !== 'object' || typeof despues !== 'object') return [];
  const keys = new Set([...Object.keys(antes), ...Object.keys(despues)]);
  const out = [];
  for (const k of keys) {
    if (k === 'cambios' || k === 'camposExtra') continue;
    const a = antes[k];
    const d = despues[k];
    if (String(a ?? '') !== String(d ?? '')) {
      out.push({ campo: k, antes: a ?? null, despues: d ?? null });
    }
  }
  if (antes.camposExtra || despues.camposExtra) {
    const ae = antes.camposExtra || {};
    const de = despues.camposExtra || {};
    const ek = new Set([...Object.keys(ae), ...Object.keys(de)]);
    for (const k of ek) {
      if (String(ae[k] ?? '') !== String(de[k] ?? '')) {
        out.push({ campo: k, antes: ae[k] ?? null, despues: de[k] ?? null });
      }
    }
  }
  return out;
}

function AuditDetail({ evento }) {
  const cambios = extractCambios(evento);
  const accion = String(evento.accion || '').toUpperCase();

  if (accion === 'ELIMINAR' && evento.antes) {
    return (
      <div className="att-audit-detail">
        <div className="att-audit-detail__title">Registro eliminado</div>
        <dl className="att-audit-kv">
          {Object.entries(evento.antes)
            .filter(([k, v]) => k !== 'camposExtra' && k !== 'cambios' && v != null && v !== '')
            .map(([k, v]) => (
              <div key={k} className="att-audit-kv__row">
                <dt>{labelCampo(k)}</dt>
                <dd>{fmtAuditVal(v)}</dd>
              </div>
            ))}
          {evento.antes.camposExtra && typeof evento.antes.camposExtra === 'object'
            ? Object.entries(evento.antes.camposExtra).map(([k, v]) => (
                <div key={`x-${k}`} className="att-audit-kv__row">
                  <dt>{labelCampo(k)}</dt>
                  <dd>{fmtAuditVal(v)}</dd>
                </div>
              ))
            : null}
        </dl>
      </div>
    );
  }

  if (accion === 'CREAR' && evento.despues) {
    const data = { ...evento.despues };
    delete data.cambios;
    return (
      <div className="att-audit-detail">
        <div className="att-audit-detail__title">Datos creados</div>
        <dl className="att-audit-kv">
          {Object.entries(data)
            .filter(([k, v]) => k !== 'camposExtra' && v != null && v !== '')
            .map(([k, v]) => (
              <div key={k} className="att-audit-kv__row">
                <dt>{labelCampo(k)}</dt>
                <dd>{fmtAuditVal(v)}</dd>
              </div>
            ))}
          {data.camposExtra && typeof data.camposExtra === 'object'
            ? Object.entries(data.camposExtra).map(([k, v]) => (
                <div key={`x-${k}`} className="att-audit-kv__row">
                  <dt>{labelCampo(k)}</dt>
                  <dd>{fmtAuditVal(v)}</dd>
                </div>
              ))
            : null}
        </dl>
      </div>
    );
  }

  if (cambios.length > 0) {
    return (
      <div className="att-audit-detail">
        <div className="att-audit-detail__title">Cambios ({cambios.length})</div>
        <div className="table-responsive">
          <table className="table table-sm mb-0 att-audit-changes">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Antes</th>
                <th>Después</th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c) => (
                <tr key={c.campo}>
                  <td className="fw-semibold">{labelCampo(c.campo)}</td>
                  <td className="att-audit-changes__old">{fmtAuditVal(c.antes)}</td>
                  <td className="att-audit-changes__new">{fmtAuditVal(c.despues)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (evento.antes || evento.despues) {
    return (
      <div className="att-audit-detail">
        <div className="row g-2">
          {evento.antes ? (
            <div className="col-md-6">
              <div className="att-audit-detail__title">Antes</div>
              <pre className="att-audit-json">{JSON.stringify(evento.antes, null, 2)}</pre>
            </div>
          ) : null}
          {evento.despues ? (
            <div className="col-md-6">
              <div className="att-audit-detail__title">Después</div>
              <pre className="att-audit-json">{JSON.stringify(evento.despues, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="att-audit-detail text-muted small">Sin detalle adicional en este evento (registro antiguo).</div>
  );
}

export function GestionAuditoriaPage() {
  const { user } = useOutletContext() || {};
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [modulo, setModulo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const query = useQuery({
    queryKey: ['gestion-auditoria', page, q, modulo],
    queryFn: () => {
      const u = new URLSearchParams({ page: String(page), limit: '40' });
      if (q.trim()) u.set('q', q.trim());
      if (modulo) u.set('modulo', modulo);
      return getJson(`/api/gestion/auditoria?${u}`);
    },
    enabled: isAdminLike(user),
  });

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const rows = query.data?.eventos || [];
  const meta = query.data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="att-main att-main--wide att-admin-page att-gestion-page">
      <div className="att-gestion-page__toolbar">
        <div className="att-gestion-page__actions">
          <GestionPanelModeToggle />
          <GestionNav />
        </div>
      </div>
      <p className="small text-muted mb-3">
        Haz clic en una fila para ver el detalle de lo que cambió (antes → después).
      </p>
      <div className="row g-2 mb-3">
        <div className="col-12 col-sm-6 col-md-4">
          <input
            className="form-control form-control-sm"
            placeholder="Buscar email, resumen, acción…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="form-select form-select-sm"
            value={modulo}
            onChange={(e) => {
              setModulo(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los módulos</option>
            <option value="asistencia">Asistencia</option>
            <option value="informacion">Información</option>
            <option value="rubricas">Rúbricas</option>
            <option value="reportes">Reportes</option>
            <option value="informes">Informes</option>
            <option value="lvlup">LVL UP</option>
            <option value="inscripciones">Inscripciones</option>
            <option value="otros">Otros tipos</option>
            <option value="participantes">Participantes</option>
            <option value="responsables">Responsables</option>
            <option value="cursos">Cursos</option>
            <option value="permisos">Permisos</option>
            <option value="tipo_campos">Campos</option>
            <option value="auditoria">Auditoría</option>
          </select>
        </div>
      </div>
      {query.isError ? <div className="alert alert-danger small">{query.error?.message}</div> : null}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0 att-audit-table">
            <thead>
              <tr>
                <th style={{ width: 28 }} />
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Qué pasó</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {query.isPending ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </td>
                </tr>
              ) : null}
              {!query.isPending && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">Sin eventos</td>
                </tr>
              ) : null}
              {rows.map((r) => {
                const open = expandedId === r.id;
                const nCambios = extractCambios(r).length;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`att-audit-row ${open ? 'is-open' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId(open ? null : r.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedId(open ? null : r.id);
                        }
                      }}
                    >
                      <td className="text-muted small">{open ? '▾' : '▸'}</td>
                      <td className="text-nowrap small">{formatFechaHora(r.creadoEn)}</td>
                      <td>
                        <div className="fw-semibold small">{r.email || '—'}</div>
                        <div className="text-muted small">{r.rol || ''}</div>
                      </td>
                      <td>
                        <span
                          className={`badge border ${
                            r.accion === 'ELIMINAR'
                              ? 'text-bg-danger'
                              : r.accion === 'CREAR'
                                ? 'text-bg-success'
                                : 'text-bg-light'
                          }`}
                        >
                          {r.accion}
                        </span>
                      </td>
                      <td className="small">
                        {r.modulo}
                        {r.entidad ? (
                          <div className="text-muted">
                            {r.entidad} {r.entidadId || ''}
                          </div>
                        ) : null}
                      </td>
                      <td className="small">
                        <div className="att-audit-resumen">{r.resumen || '—'}</div>
                        {nCambios > 0 ? (
                          <div className="text-muted">{nCambios} campo(s) modificado(s)</div>
                        ) : null}
                      </td>
                      <td className="small text-muted">{r.ip || '—'}</td>
                    </tr>
                    {open ? (
                      <tr className="att-audit-expand">
                        <td colSpan={7}>
                          <AuditDetail evento={r} />
                          {r.userAgent ? (
                            <div className="small text-muted mt-2 text-truncate" title={r.userAgent}>
                              Agente: {r.userAgent}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between small">
          <span>{meta.total} eventos</span>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <span>Pág. {meta.page} / {meta.totalPages}</span>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GestionPermisosPage() {
  const { user } = useOutletContext() || {};
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState([]);
  const { toast, showToast, setToast } = useAttToast();

  const modsQuery = useQuery({
    queryKey: ['gestion-me-permisos'],
    queryFn: () => getJson('/api/gestion/me/permisos'),
    enabled: isAdminLike(user),
  });

  const adminsQuery = useQuery({
    queryKey: ['gestion-admins'],
    queryFn: () => getJson('/api/gestion/permisos/admins'),
    enabled: isAdminLike(user),
  });

  const permQuery = useQuery({
    queryKey: ['gestion-permisos-user', selectedId],
    queryFn: () => getJson(`/api/gestion/permisos/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    const mods = modsQuery.data?.modulos || [];
    const existing = new Map((permQuery.data?.permisos || []).map((p) => [p.modulo, p]));
    setDraft(
      mods.map((m) => {
        const cur = existing.get(m.id);
        return {
          modulo: m.id,
          label: m.label,
          grupo: m.grupo || 'Otros',
          leer: Boolean(cur?.leer),
          crear: Boolean(cur?.crear),
          editar: Boolean(cur?.editar),
          eliminar: Boolean(cur?.eliminar),
        };
      }),
    );
  }, [modsQuery.data, permQuery.data]);

  const setRowFlags = (idx, flags) => {
    setDraft((prev) => prev.map((r, i) => (i === idx ? { ...r, ...flags } : r)));
  };

  const saveMut = useMutation({
    mutationFn: () =>
      putJson(`/api/gestion/permisos/${selectedId}`, {
        permisos: draft.map(({ modulo, leer, crear, editar, eliminar }) => ({
          modulo,
          leer,
          crear,
          editar,
          eliminar,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestion-permisos-user', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['gestion-me-permisos'] });
      showToast('success', 'Permisos guardados correctamente');
    },
    onError: (err) => {
      showToast('danger', err?.message || 'No se pudieron guardar los permisos');
    },
  });

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const admins = (adminsQuery.data?.usuarios || []).filter(
    (u) => String(u.rol) !== 'SuperAdministrador',
  );

  return (
    <div className="att-main att-main--wide att-admin-page att-gestion-page">
      <div className="att-gestion-page__toolbar">
        <div className="att-gestion-page__actions">
          <GestionPanelModeToggle />
          <GestionNav />
        </div>
      </div>
      {!isSuperAdmin(user) ? (
        <div className="alert alert-info small">
          Solo SuperAdministrador debería administrar permisos en producción. Si no tiene acceso, pida
          que le asignen el módulo <code>permisos</code>.
        </div>
      ) : null}
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <label className="form-label small">Administrador</label>
          <SearchableSelect
            value={selectedId}
            onChange={setSelectedId}
            options={admins.map((a) => ({
              value: String(a.id),
              label: `${a.nombre || a.email} · ${a.rol}`,
            }))}
            placeholder="Seleccione usuario…"
            allowClear={false}
          />
          <p className="small text-muted mt-2 mb-0">
            Incluye operación (Asistencia, Reportes, LVL UP, etc.) y gestión. Sin filas = sin acceso.
            Marque solo lo necesario y guarde. SuperAdministrador siempre tiene acceso pleno.
          </p>
        </div>
        <div className="col-12 col-lg-8">
          {!selectedId ? (
            <div className="text-muted small">Seleccione un administrador para editar permisos.</div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle att-gestion-permisos-table">
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th className="text-center">Leer</th>
                      <th className="text-center">Crear</th>
                      <th className="text-center">Editar</th>
                      <th className="text-center">Eliminar</th>
                      <th className="text-end d-none d-md-table-cell">Fila</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((row, idx) => {
                      const prevGrupo = idx > 0 ? draft[idx - 1].grupo : null;
                      const showGrupo = row.grupo && row.grupo !== prevGrupo;
                      return (
                        <Fragment key={row.modulo}>
                          {showGrupo ? (
                            <tr className="table-light">
                              <td colSpan={6} className="small fw-bold text-uppercase text-muted py-2">
                                {row.grupo}
                              </td>
                            </tr>
                          ) : null}
                          <tr>
                            <td className="small fw-semibold">{row.label}</td>
                            {['leer', 'crear', 'editar', 'eliminar'].map((k) => (
                              <td key={k} className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input m-0"
                                  checked={Boolean(row[k])}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setDraft((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, [k]: checked } : r)),
                                    );
                                  }}
                                  aria-label={`${row.label} ${k}`}
                                />
                              </td>
                            ))}
                            <td className="text-end text-nowrap d-none d-md-table-cell">
                              <button
                                type="button"
                                className="btn btn-link btn-sm py-0 px-1"
                                onClick={() =>
                                  setRowFlags(idx, {
                                    leer: true,
                                    crear: true,
                                    editar: true,
                                    eliminar: true,
                                  })
                                }
                              >
                                Marcar todos
                              </button>
                              <span className="text-muted">·</span>
                              <button
                                type="button"
                                className="btn btn-link btn-sm py-0 px-1"
                                onClick={() =>
                                  setRowFlags(idx, {
                                    leer: false,
                                    crear: false,
                                    editar: false,
                                    eliminar: false,
                                  })
                                }
                              >
                                Desmarcar
                              </button>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="card-footer d-flex flex-wrap justify-content-end align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saveMut.isPending}
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? 'Guardando…' : 'Guardar permisos'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}

export function GestionTipoCamposPage() {
  const { user } = useOutletContext() || {};
  const [tipo, setTipo] = useState('2');
  const [idCurso, setIdCurso] = useState('');
  const [editing, setEditing] = useState(null);

  const tiposQuery = useQuery({
    queryKey: ['gestion-tipos'],
    queryFn: () => getJson('/api/gestion/tipos'),
    enabled: isAdminLike(user),
  });

  const colsQuery = useQuery({
    queryKey: ['gestion-cols-insc'],
    queryFn: () => getJson('/api/gestion/config/columnas-inscripciones'),
    enabled: isAdminLike(user),
    staleTime: 5 * 60_000,
  });

  const catalogosQuery = useQuery({
    queryKey: ['gestion-catalogos'],
    queryFn: () => getJson('/api/gestion/config/catalogos'),
    enabled: isAdminLike(user),
    staleTime: 5 * 60_000,
  });

  const cursosQuery = useQuery({
    queryKey: ['gestion-cursos-tipo-campos', tipo],
    queryFn: () => getJson(`/api/gestion/cursos?soloActivos=false&tipo=${encodeURIComponent(tipo)}`),
    enabled: isAdminLike(user) && Boolean(tipo),
    staleTime: 60_000,
  });

  const camposQuery = useQuery({
    queryKey: ['gestion-tipo-campos', tipo, idCurso || '*'],
    queryFn: () => {
      const u = new URLSearchParams({ tipo, soloActivos: 'false' });
      if (idCurso) u.set('idCurso', idCurso);
      return getJson(`/api/gestion/config/tipo-campos?${u.toString()}`);
    },
    enabled: isAdminLike(user) && Boolean(tipo),
  });

  const saveMut = useMutation({
    mutationFn: (form) =>
      postJson('/api/gestion/config/tipo-campos', {
        ...form,
        tipo: Number(tipo),
        idCurso: form.idCurso != null ? String(form.idCurso) : '',
        catalogo: form.catalogo || null,
        tipoInput: form.catalogo ? 'relation' : form.tipoInput,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestion-tipo-campos', tipo] });
      setEditing(null);
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteJson(`/api/gestion/config/tipo-campos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gestion-tipo-campos', tipo] }),
  });

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const tiposOptions = (tiposQuery.data?.tipos || [])
    .filter((t) => Number(t.id) !== 1)
    .map((t) => ({ value: String(t.id), label: `${t.nombre} (${t.id})` }));

  const cursoOptions = [
    { value: '', label: 'Todos los cursos (por defecto)' },
    ...(cursosQuery.data?.cursos || []).map((c) => ({
      value: String(c.id),
      label: `${c.nombre || c.id} (${c.id})`,
      searchText: `${c.id} ${c.nombre || ''}`,
    })),
  ];

  const colOptions = (colsQuery.data?.columnas || []).map((c) => ({
    value: c.field,
    label: c.field,
  }));

  const rows = camposQuery.data?.campos || [];
  const form = editing || {
    campoKey: '',
    columnaDb: '',
    label: '',
    tipoInput: 'text',
    catalogo: '',
    idCurso: idCurso || '',
    visibleLista: false,
    visibleDetalle: true,
    visibleForm: true,
    requerido: false,
    orden: 0,
    activo: true,
  };

  const catalogosOptions = [
    { value: '', label: 'Sin relación (texto libre)' },
    ...(catalogosQuery.data?.catalogos || []).map((c) => ({
      value: c.key,
      label: `${c.label} (${c.valor} → ${c.etiqueta})`,
    })),
  ];

  return (
    <div className="att-main att-main--wide att-admin-page att-gestion-page">
      <div className="att-gestion-page__toolbar">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              setEditing({
                campoKey: '',
                columnaDb: '',
                label: '',
                tipoInput: 'text',
                catalogo: '',
                idCurso: idCurso || '',
                visibleLista: false,
                visibleDetalle: true,
                visibleForm: true,
                requerido: false,
                orden: rows.length * 10,
                activo: true,
              })
            }
          >
            Nuevo campo
          </button>
        </div>
        <div className="att-gestion-page__actions">
          <GestionPanelModeToggle />
          <GestionNav />
        </div>
      </div>
      <p className="small text-muted">
        Defina qué columnas de <code>inscripciones_1</code> se muestran en otros tipos. Si no elige un
        curso, el campo aplica a <strong>todos</strong>. Si elige un curso concreto, ese campo tiene
        prioridad solo para ese curso (el resto sigue usando la configuración global).
      </p>
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5" style={{ maxWidth: '100%', width: 'min(360px, 100%)' }}>
          <label className="form-label small mb-1">Tipo</label>
          <SearchableSelect
            value={tipo}
            onChange={(v) => {
              setTipo(v);
              setIdCurso('');
              setEditing(null);
            }}
            options={tiposOptions}
            allowClear={false}
          />
        </div>
        <div className="col-12 col-md-7" style={{ maxWidth: '100%', width: 'min(420px, 100%)' }}>
          <label className="form-label small mb-1">Curso (opcional)</label>
          <SearchableSelect
            value={idCurso}
            onChange={(v) => {
              setIdCurso(v || '');
              setEditing(null);
            }}
            options={cursoOptions}
            placeholder="Todos los cursos…"
          />
        </div>
      </div>

      {editing ? (
        <GestionPanel
          open
          onClose={() => setEditing(null)}
          title={form.id ? 'Editar campo' : 'Nuevo campo'}
          width={560}
          footer={
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate(form)}
              >
                Guardar
              </button>
            </>
          }
        >
            {saveMut.isError ? <div className="alert alert-danger small">{saveMut.error?.message}</div> : null}
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label small">Aplica a curso</label>
                <SearchableSelect
                  value={form.idCurso || ''}
                  onChange={(v) => setEditing((p) => ({ ...p, idCurso: v || '' }))}
                  options={cursoOptions}
                  placeholder="Todos los cursos…"
                />
                <div className="form-text">
                  Vacío = todos los cursos del tipo. Un ID concreto = solo ese curso (override).
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Clave API</label>
                <input
                  className="form-control form-control-sm"
                  value={form.campoKey}
                  disabled={Boolean(form.id)}
                  onChange={(e) => setEditing((p) => ({ ...p, campoKey: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Columna BD</label>
                <SearchableSelect
                  value={form.columnaDb}
                  onChange={(v) => setEditing((p) => ({ ...p, columnaDb: v }))}
                  options={colOptions}
                  placeholder="Columna…"
                />
              </div>
              <div className="col-md-5">
                <label className="form-label small">Nombre visible</label>
                <input
                  className="form-control form-control-sm"
                  value={form.label}
                  onChange={(e) => setEditing((p) => ({ ...p, label: e.target.value }))}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Tipo input</label>
                <SearchableSelect
                  value={form.catalogo ? 'relation' : form.tipoInput}
                  onChange={(v) =>
                    setEditing((p) => ({
                      ...p,
                      tipoInput: v,
                      ...(v !== 'relation' ? { catalogo: '' } : {}),
                    }))
                  }
                  options={[
                    { value: 'text', label: 'Texto' },
                    { value: 'textarea', label: 'Área' },
                    { value: 'date', label: 'Fecha' },
                    { value: 'number', label: 'Número' },
                    { value: 'select', label: 'Selector fijo' },
                    { value: 'relation', label: 'Relación (catálogo)' },
                  ]}
                  allowClear={false}
                />
              </div>
              <div className="col-md-5">
                <label className="form-label small">Catálogo relacionado</label>
                <SearchableSelect
                  value={form.catalogo || ''}
                  onChange={(v) =>
                    setEditing((p) => ({
                      ...p,
                      catalogo: v || '',
                      tipoInput: v ? 'relation' : p.tipoInput === 'relation' ? 'text' : p.tipoInput,
                    }))
                  }
                  options={catalogosOptions}
                  placeholder="Sin relación…"
                  allowClear
                />
                <div className="form-text">
                  La columna BD debe guardar el ID (ej. <code>Asignatura</code> = 2 → Matemáticas).
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label small">Orden</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={form.orden}
                  onChange={(e) => setEditing((p) => ({ ...p, orden: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="col-12 d-flex flex-wrap align-items-end gap-3 pb-1">
                {[
                  ['visibleLista', 'Lista'],
                  ['visibleDetalle', 'Detalle'],
                  ['visibleForm', 'Formulario'],
                  ['requerido', 'Requerido'],
                  ['activo', 'Activo'],
                ].map(([k, lab]) => (
                  <label key={k} className="small mb-0">
                    <input
                      type="checkbox"
                      className="me-1"
                      checked={Boolean(form[k])}
                      onChange={(e) => setEditing((p) => ({ ...p, [k]: e.target.checked }))}
                    />
                    {lab}
                  </label>
                ))}
              </div>
            </div>
        </GestionPanel>
      ) : null}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Label</th>
                <th>Curso</th>
                <th>Clave</th>
                <th>Columna</th>
                <th>Catálogo</th>
                <th>Lista</th>
                <th>Detalle</th>
                <th>Form</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-4">Sin campos para este tipo</td>
                </tr>
              ) : null}
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.orden}</td>
                  <td className="fw-semibold">{c.label}</td>
                  <td className="small">
                    {c.idCurso
                      ? cursoOptions.find((o) => o.value === String(c.idCurso))?.label || c.idCurso
                      : 'Todos'}
                  </td>
                  <td className="small">{c.campoKey}</td>
                  <td className="small">{c.columnaDb}</td>
                  <td className="small">{c.catalogo || '—'}</td>
                  <td>{c.visibleLista ? 'Sí' : '—'}</td>
                  <td>{c.visibleDetalle ? 'Sí' : '—'}</td>
                  <td>{c.visibleForm ? 'Sí' : '—'}</td>
                  <td className="text-nowrap">
                    <button
                      type="button"
                      className="btn btn-link btn-sm"
                      onClick={() =>
                        setEditing({
                          ...c,
                          catalogo: c.catalogo || '',
                          idCurso: c.idCurso || '',
                        })
                      }
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger"
                      onClick={() => {
                        if (window.confirm('¿Eliminar campo?')) delMut.mutate(c.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
