import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, apiUrl, getJson } from '../../lib/api.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { getDocumento, getNombreCompleto } from '../../lib/inscritoHelpers.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';
import { queryClient } from '../../lib/queryClient.js';
import { informeYaEnviadoHoyColombia } from '../../lib/informeEnvioColombia.js';

function cursoId(curso) {
  return String(curso?.ID_Curso ?? '').trim();
}

function cursoLabel(curso) {
  return curso?.Nombre_del_curso || curso?.Nombre_Corto_Curso || curso?.ID_Curso || '';
}

function fmtFecha(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleString('es-CO');
}

function normalizeValorToDb(value) {
  if (value === 'alto') return 'Satisfactorio Alto';
  if (value === 'medio') return 'Satisfactorio Medio';
  return 'Satisfactorio Básico';
}

function nivelFromDb(value) {
  const v = normalizeForSearch(value);
  if (v.includes('alto')) return 'alto';
  if (v.includes('medio') || v.includes('basico')) return 'medio';
  return 'bajo';
}

function toRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rubricas)) return payload.rubricas;
  if (typeof payload === 'object') {
    return Object.values(payload).filter((item) => item && typeof item === 'object' && 'id' in item);
  }
  return [];
}

function revokeObjectUrlIfBlob(url) {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * URL para <img>: siempre ruta bajo el mismo origen del SPA (/uploads/...), con proxy en dev.
 * Evita cross-origin + CORP y URLs absolutas al API cuando VITE_API_URL apunta a otro host.
 */
function mensajeVentanaEnvioInforme(ventana) {
  if (!ventana || ventana.envioInformePermitido === true) return '';
  const { codigoBloqueo, fechaInicio, fechaFin } = ventana;
  if (codigoBloqueo === 'disabled') {
    return 'El envío de informes por correo no está habilitado.';
  }
  if (codigoBloqueo === 'before_window') {
    return fechaInicio
      ? `El envío de informes estará disponible a partir del ${fechaInicio}.`
      : 'El período de envío de informes aún no ha comenzado.';
  }
  if (codigoBloqueo === 'after_window') {
    return fechaFin
      ? `Ya se cumplió la fecha de envío de informes (período hasta el ${fechaFin}).`
      : 'Ya se cumplió la fecha de envío de informes por correo.';
  }
  return 'No es posible enviar informes por correo en este momento.';
}

function evaluacionFotoSrc(foto) {
  if (foto == null) return '';
  const s = String(foto).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  const p = s.startsWith('/') ? s : `/${s}`;
  if (p.startsWith('/uploads')) return apiUrl(p);
  return p;
}

function SuccessModal({
  open,
  onClose,
  onViewPdf,
  onSendMail,
  correoDestino,
  envioInformePermitido,
  ventanaCargando,
  bloqueoMensaje,
  isSending,
  yaEnviadoHoy,
}) {
  if (!open) return null;
  const envioBloqueado = !ventanaCargando && (!envioInformePermitido || yaEnviadoHoy);
  return (
    <div className="att-modal-backdrop" role="dialog" aria-modal="true">
      <div className="att-modal att-modal--excusa">
        <div className="att-modal__head d-flex align-items-center justify-content-between gap-2">
          <h3 className="att-modal__title">Evaluación creada exitosamente.</h3>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="att-modal__body d-grid gap-3">
          <p className="mb-0 small text-muted">Puedes ver el PDF ahora o enviarlo por correo.</p>
          {correoDestino ? (
            <p className="mb-0 small text-muted">
              Correo de destino: <span className="text-body">{correoDestino}</span>
            </p>
          ) : null}
          {ventanaCargando ? (
            <p className="mb-0 small text-muted">Comprobando si el envío por correo está permitido…</p>
          ) : null}
          {yaEnviadoHoy ? (
            <div className="alert alert-info small mb-0 py-2" role="alert">
              Ya se envió el informe por correo hoy. Podrás volver a enviarlo mañana.
            </div>
          ) : null}
          {envioBloqueado && bloqueoMensaje && !yaEnviadoHoy ? (
            <div className="alert alert-warning small mb-0 py-2" role="alert">
              {bloqueoMensaje}
            </div>
          ) : null}
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={onViewPdf}>
              Ver PDF
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onSendMail}
              disabled={ventanaCargando || envioBloqueado || isSending || yaEnviadoHoy}
            >
              {isSending ? 'Enviando…' : 'Enviar correo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function EvalDetailModal({ open, evaluacion, onClose }) {
  if (!open || !evaluacion) return null;
  return (
    <div className="att-modal-backdrop" role="dialog" aria-modal="true">
      <div className="att-modal" style={{ maxWidth: '920px' }}>
        <div className="att-modal__head d-flex align-items-center justify-content-between gap-2">
          <h3 className="att-modal__title">{evaluacion.participante || 'Detalle evaluación'}</h3>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="att-modal__body d-grid gap-2">
          <p className="small mb-0">
            <strong>Categoría:</strong> {evaluacion.nombreCategoria || '—'}
          </p>
          <p className="small mb-0">
            <strong>Creada:</strong> {fmtFecha(evaluacion.fecha_creacion)}
          </p>
          <p className="small mb-0">
            <strong>Modificada:</strong> {fmtFecha(evaluacion.fecha_modificacion || evaluacion.fecha_creacion)}
          </p>
          <p className="small mb-1">
            <strong>Comentario:</strong> {evaluacion.comentario || '—'}
          </p>
          <div className="att-reportes-rubricas">
            {(evaluacion.detalles || []).map((d) => (
              <div key={`${evaluacion.id}-${d.id_rubrica}`} className="att-reportes-rubrica-card">
                <h5>{d.rubrica?.nombre || `Rúbrica ${d.id_rubrica}`}</h5>
                <p className="small text-muted mb-1">{d.rubrica?.tipo || ''}</p>
                <span className="badge text-bg-light border">{d.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportesPage() {
  const { user } = useOutletContext() || {};
  const email = user?.email || '';
  const isAdmin = String(user?.rol || '').trim() === 'Administrador';
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [tab, setTab] = useState('historial');
  const [comentario, setComentario] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [niveles, setNiveles] = useState({});
  const [selectedEvalId, setSelectedEvalId] = useState(null);
  const [detailEval, setDetailEval] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [toastState, setToastState] = useState({ show: false, type: 'success', message: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [editingEvalId, setEditingEvalId] = useState(null);
  const [mobileEvalOpen, setMobileEvalOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const coursePickerRef = useRef(null);

  const isNarrowViewport = useMediaQuery('(max-width: 767px)');

  const navEnabled = isNavKeyEnabled('reportes');
  const testEmail = import.meta.env.VITE_TEST_EMAIL || email || 'correo.prueba@club.local';

  useEffect(() => {
    return () => {
      revokeObjectUrlIfBlob(previewUrl);
    };
  }, [previewUrl]);

  const cursosQuery = useQuery({
    queryKey: ['reportes-cursos', email, isAdmin],
    queryFn: () =>
      isAdmin
        ? getJson(`/api/cursos?scope=all&correo=${encodeURIComponent(email)}`)
        : getJson(`/api/cursos?correo=${encodeURIComponent(email)}&soloMisCursos=true`),
    enabled: Boolean(email),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const cursos = useMemo(() => cursosQuery.data?.cursos ?? [], [cursosQuery.data]);
  const effectiveCursoId = useMemo(
    () => selectedCursoId || cursoId(cursos[0]) || '',
    [selectedCursoId, cursos],
  );
  const selectedCurso = useMemo(
    () => cursos.find((c) => cursoId(c) === effectiveCursoId) || null,
    [cursos, effectiveCursoId],
  );

  const inscritosQuery = useQuery({
    queryKey: ['reportes-inscritos', effectiveCursoId],
    queryFn: () =>
      getJson(`/api/inscritos?estado=CONFIRMADO&withRutaExtra=true&lite=true&idCurso=${encodeURIComponent(effectiveCursoId)}`),
    enabled: Boolean(effectiveCursoId),
    placeholderData: (prev) => prev,
    staleTime: 45_000,
  });

  const participants = useMemo(() => inscritosQuery.data?.inscritos || [], [inscritosQuery.data]);
  const filteredCursos = useMemo(() => {
    const q = normalizeForSearch(courseSearch);
    if (!q) return cursos;
    return cursos.filter((c) => normalizeForSearch(cursoLabel(c)).includes(q));
  }, [cursos, courseSearch]);
  const filteredParticipants = useMemo(() => {
    const q = normalizeForSearch(participantSearch);
    const rows = !q
      ? participants
      : participants.filter((p) => normalizeForSearch(getNombreCompleto(p)).includes(q));
    return [...rows].sort((a, b) => getNombreCompleto(a).localeCompare(getNombreCompleto(b), 'es'));
  }, [participants, participantSearch]);

  const selectedParticipant = useMemo(
    () => participants.find((p) => getDocumento(p) === selectedDoc) || null,
    [participants, selectedDoc],
  );

  const evalsQuery = useQuery({
    queryKey: ['reportes-evals', selectedDoc],
    queryFn: () => getJson(`/api/evaluaciones/participante/${encodeURIComponent(selectedDoc)}`),
    enabled: Boolean(selectedDoc),
    placeholderData: (prev) => prev,
  });

  const evaluaciones = useMemo(() => {
    const rows = evalsQuery.data?.evaluaciones || [];
    if (!effectiveCursoId) return rows;
    return rows.filter((e) => String(e?.categoria ?? '').trim() === String(effectiveCursoId).trim());
  }, [evalsQuery.data, effectiveCursoId]);
  const selectedEval = useMemo(
    () => evaluaciones.find((e) => Number(e.id) === Number(selectedEvalId)) || evaluaciones[0] || null,
    [evaluaciones, selectedEvalId],
  );

  const rubricasQuery = useQuery({
    queryKey: ['reportes-rubricas', effectiveCursoId],
    queryFn: () => getJson(`/api/rubricas?cursoId=${encodeURIComponent(effectiveCursoId)}`),
    enabled: Boolean(effectiveCursoId),
    placeholderData: (prev) => prev,
  });

  const rubricasActivas = useMemo(() => {
    const rows = toRows(rubricasQuery.data);
    return rows.filter((r) => String(r.estado || 'ACTIVO').toUpperCase() === 'ACTIVO');
  }, [rubricasQuery.data]);

  const hasDraftChanges = useMemo(
    () => Boolean(comentario.trim() || fotoFile || previewUrl || Object.keys(niveles).length > 0),
    [comentario, fotoFile, previewUrl, niveles],
  );

  const resetDraft = () => {
    setComentario('');
    setFotoFile(null);
    revokeObjectUrlIfBlob(previewUrl);
    setPreviewUrl('');
    setNiveles({});
    setEditingEvalId(null);
  };

  const startEditEvaluation = (evaluacion) => {
    if (!evaluacion) return;
    setTab('crear');
    setComentario(String(evaluacion.comentario || ''));
    setFotoFile(null);
    revokeObjectUrlIfBlob(previewUrl);
    setPreviewUrl(evaluacionFotoSrc(evaluacion.foto));
    const nextLevels = {};
    (evaluacion.detalles || []).forEach((d) => {
      nextLevels[d.id_rubrica] = nivelFromDb(d.valor);
    });
    setNiveles(nextLevels);
    setSelectedEvalId(evaluacion.id);
    setEditingEvalId(evaluacion.id);
  };

  const closeMobileEvalPanel = () => {
    if (hasDraftChanges) {
      const ok = window.confirm(
        '¿Cerrar? Se perderán los cambios no guardados en esta evaluación.',
      );
      if (!ok) return;
      resetDraft();
    }
    setMobileEvalOpen(false);
  };

  useEffect(() => {
    if (!courseOpen) return undefined;
    const onDown = (event) => {
      if (!coursePickerRef.current) return;
      if (!coursePickerRef.current.contains(event.target)) setCourseOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [courseOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParticipant || !selectedCurso) throw new Error('Selecciona participante y categoría');
      const faltantes = rubricasActivas.some((r) => !niveles[r.id]);
      if (faltantes) throw new Error('Debes calificar todas las rúbricas activas');

      const form = new FormData();
      form.append('participante', getNombreCompleto(selectedParticipant));
      form.append('identificacion', getDocumento(selectedParticipant));
      form.append('categoria', cursoId(selectedCurso));
      form.append('nombreCategoria', cursoLabel(selectedCurso));
      form.append('comentario', comentario);
      form.append('enviado', 'false');
      if (fotoFile) form.append('foto', fotoFile);
      form.append(
        'rubricas',
        JSON.stringify(
          rubricasActivas.map((r) => ({
            id_rubrica: r.id,
            valor: normalizeValorToDb(niveles[r.id]),
          })),
        ),
      );
      return apiFetch('/api/evaluaciones', { method: 'POST', body: form });
    },
    onSuccess: (data) => {
      setSuccessData(data?.evaluacion || null);
      setToastState({ show: true, type: 'success', message: 'Evaluación guardada correctamente.' });
      window.setTimeout(() => setToastState((prev) => ({ ...prev, show: false })), 2200);
      resetDraft();
      setTab('historial');
      setSelectedEvalId(data?.evaluacion?.id || null);
      queryClient.invalidateQueries({ queryKey: ['reportes-evals', selectedDoc] });
    },
    onError: (error) => {
      setToastState({ show: true, type: 'danger', message: error?.message || 'No se pudo guardar la evaluación' });
      window.setTimeout(() => setToastState((prev) => ({ ...prev, show: false })), 2600);
    },
  });

  const ventanaEnvioQuery = useQuery({
    queryKey: ['evaluaciones-ventana-envio'],
    queryFn: () => getJson('/api/evaluaciones/ventana-envio'),
    staleTime: 30_000,
  });

  const ventanaVentana = ventanaEnvioQuery.data;
  const ventanaCargando = ventanaEnvioQuery.isLoading;
  const ventanaFallo = ventanaEnvioQuery.isError;
  const envioInformePermitidoPorApi =
    ventanaEnvioQuery.isSuccess && ventanaVentana?.envioInformePermitido === true;

  const enviarMutation = useMutation({
    mutationFn: ({ id, correo }) =>
      apiFetch(`/api/evaluaciones/${id}/enviar`, {
        method: 'POST',
        body: JSON.stringify({ destinatario: correo }),
      }),
    onSuccess: (data, variables) => {
      const updated = data?.evaluacion;
      const docKey = variables?.identificacion;
      if (docKey && updated?.id != null) {
        queryClient.setQueryData(['reportes-evals', docKey], (old) => {
          if (!old?.evaluaciones) return old;
          return {
            ...old,
            evaluaciones: old.evaluaciones.map((row) =>
              Number(row.id) === Number(updated.id) ? { ...row, ...updated } : row,
            ),
          };
        });
      }
      setDetailEval((d) => (d && Number(d.id) === Number(updated?.id) ? { ...d, ...updated } : d));
      setSuccessData((s) => (s && Number(s.id) === Number(updated?.id) ? { ...s, ...updated } : s));
      setToastState({ show: true, type: 'success', message: 'Informe enviado correctamente.' });
      window.setTimeout(() => setToastState((prev) => ({ ...prev, show: false })), 2200);
    },
    onError: (error) => {
      setToastState({ show: true, type: 'danger', message: error?.message || 'No se pudo enviar el informe' });
      window.setTimeout(() => setToastState((prev) => ({ ...prev, show: false })), 2600);
    },
  });

  const rubricasCompletas = useMemo(
    () => rubricasActivas.filter((r) => Boolean(niveles[r.id])).length,
    [rubricasActivas, niveles],
  );
  const totalRubricas = rubricasActivas.length;
  const progresoPct = totalRubricas ? Math.round((rubricasCompletas / totalRubricas) * 100) : 0;

  if (!navEnabled) return <Navigate to={getDefaultAppPath()} replace />;

  return (
    <div className="att-main att-main--wide att-reportes-page">
      {isNarrowViewport && mobileEvalOpen ? (
        <button
          type="button"
          className="att-reportes-mobile-scrim"
          aria-label="Cerrar panel de evaluación"
          onClick={closeMobileEvalPanel}
        />
      ) : null}
      <div className="att-reportes-layout">
        <aside className="att-reportes-left">
          <h3 className="h5 fw-bold mb-2" style={{ color: '#0F2747' }}>Participantes</h3>
          <div ref={coursePickerRef} className={`att-course-picker mb-2 ${courseOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="att-select-curso att-course-trigger w-100"
              onClick={() => setCourseOpen((v) => !v)}
              aria-label="Abrir selector de categoría"
              aria-expanded={courseOpen}
            >
              {selectedCurso ? cursoLabel(selectedCurso) : 'Selecciona una categoría'}
            </button>
            {courseOpen ? (
              <div className="att-course-dropdown">
                <div className="att-search-wrap">
                  <input
                    type="search"
                    className="att-search-input att-course-search"
                    placeholder="Buscar categoría..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    aria-label="Buscar categoría"
                  />
                </div>
                <div className="att-course-list">
                  {filteredCursos.map((c) => {
                    const id = cursoId(c);
                    if (!id) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`att-course-option ${effectiveCursoId === id ? 'is-selected' : ''}`}
                        onClick={() => {
                          if (hasDraftChanges) {
                            const ok = window.confirm(
                              '¿Está seguro/a que desea cambiar de participante? Se perderán todos los cambios que no se han guardado.',
                            );
                            if (!ok) return;
                            resetDraft();
                          }
                          setSelectedCursoId(id);
                          setSelectedDoc('');
                          setSelectedEvalId(null);
                          setEditingEvalId(null);
                          setMobileEvalOpen(false);
                          setCourseOpen(false);
                        }}
                      >
                        {cursoLabel(c)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <input
            type="search"
            className="form-control form-control-sm mb-2"
            placeholder="Buscar estudiante..."
            value={participantSearch}
            onChange={(e) => setParticipantSearch(e.target.value)}
          />
          <div className="att-reportes-list">
            {filteredParticipants.map((p) => {
              const doc = getDocumento(p);
              return (
                <button
                  key={doc}
                  type="button"
                  className={`att-reportes-item ${selectedDoc === doc ? 'is-active' : ''}`}
                  onClick={() => {
                    if (selectedDoc !== doc && hasDraftChanges) {
                      const ok = window.confirm(
                        '¿Está seguro/a que desea cambiar de participante? Se perderán todos los cambios que no se han guardado.',
                      );
                      if (!ok) return;
                      resetDraft();
                    }
                    setSelectedDoc(doc);
                    setSelectedEvalId(null);
                    setDetailEval(null);
                    setEditingEvalId(null);
                    if (isNarrowViewport) setMobileEvalOpen(true);
                  }}
                >
                  {getNombreCompleto(p)}
                </button>
              );
            })}
          </div>
        </aside>

        <section
          className={`att-reportes-right${isNarrowViewport && mobileEvalOpen ? ' att-reportes-right--mobile-open' : ''}`}
          role={isNarrowViewport && mobileEvalOpen ? 'dialog' : undefined}
          aria-modal={isNarrowViewport && mobileEvalOpen ? 'true' : undefined}
          aria-labelledby={isNarrowViewport && mobileEvalOpen ? 'att-reportes-mobile-title' : undefined}
        >
          {isNarrowViewport ? (
            <div className="att-reportes-mobile-panel-head">
              <h3 className="h6 fw-bold mb-0 text-truncate flex-grow-1 me-2" id="att-reportes-mobile-title">
                {selectedParticipant ? getNombreCompleto(selectedParticipant) : 'Evaluación'}
              </h3>
              <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0" onClick={closeMobileEvalPanel}>
                Cerrar
              </button>
            </div>
          ) : null}
          <h3 className="h4 fw-bold text-center mb-2 att-reportes-right__title">Sistema de Evaluación</h3>
          <div className="att-tabs mb-3 att-reportes-right__tabs">
            <button
              type="button"
              className={`att-tab-btn ${tab === 'historial' ? 'is-active' : ''}`}
              onClick={() => setTab('historial')}
            >
              Historial
            </button>
            <button
              type="button"
              className={`att-tab-btn ${tab === 'crear' ? 'is-active' : ''}`}
              onClick={() => setTab('crear')}
            >
              Crear Reporte
            </button>
          </div>

          {!ventanaCargando && (ventanaFallo || (ventanaEnvioQuery.isSuccess && !ventanaVentana?.envioInformePermitido)) ? (
            <div className="alert alert-warning small py-2 mb-2" role="alert">
              {ventanaFallo
                ? 'No se pudo verificar la ventana de envío. Los envíos por correo están deshabilitados.'
                : mensajeVentanaEnvioInforme(ventanaVentana)}
            </div>
          ) : null}

          <div className="att-reportes-right-body">
          <div className="att-reportes-right-scroll">
            {tab === 'historial' ? (
            !selectedDoc ? (
              <div className="att-reportes-empty">Selecciona un estudiante para ver su historial de evaluaciones.</div>
            ) : evalsQuery.isLoading ? (
              <div className="att-reportes-empty text-muted">Cargando evaluaciones…</div>
            ) : evaluaciones.length === 0 ? (
              <div className="att-reportes-empty">No hay evaluaciones previas</div>
            ) : (
              <div className="d-grid gap-3">
                <div className="att-reportes-historial-cards">
                  {evaluaciones.map((e) => {
                    const isActive = Number(selectedEval?.id) === Number(e.id);
                    return (
                      <article
                        key={e.id}
                        className={`att-reporte-eval-card ${isActive ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedEvalId(e.id);
                          setDetailEval(e);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evt) => {
                          if (evt.key !== 'Enter') return;
                          setSelectedEvalId(e.id);
                          setDetailEval(e);
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <h4 className="h6 fw-bold mb-1">
                              {e.participante || getNombreCompleto(selectedParticipant) || 'Participante'} ·{' '}
                              {e.nombreCategoria || `Evaluación #${e.id}`}
                            </h4>
                            <p className="small mb-0">
                              <strong>Creada:</strong> {fmtFecha(e.fecha_creacion)}
                            </p>
                            <p className="small mb-0">
                              <strong>Modificada:</strong> {fmtFecha(e.fecha_modificacion || e.fecha_creacion)}
                            </p>
                            <p className="small mb-0">
                              <strong>Enviada:</strong> {e.fechaEnvio ? fmtFecha(e.fechaEnvio) : 'No enviada'}
                            </p>
                          </div>
                          <span className={`badge ${e.enviado ? 'text-bg-success' : 'text-bg-secondary'}`}>
                            {e.enviado ? 'ENVIADA' : 'GUARDADA'}
                          </span>
                        </div>
                        <div className="d-flex gap-2 justify-content-end mt-2">
                          <button
                            type="button"
                            className="att-reporte-action-btn att-reporte-action-btn--edit"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              startEditEvaluation(e);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor" aria-hidden="true">
                              <path d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4 88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1 17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="att-reporte-action-btn att-reporte-action-btn--pdf"
                            disabled={!e.informe}
                            onClick={(evt) => {
                              evt.stopPropagation();
                              if (e.informe) window.open(apiUrl(e.informe), '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="16" height="16" fill="currentColor">
                              <path d="M208 48L96 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l80 0 0 48-80 0c-35.3 0-64-28.7-64-64L32 64C32 28.7 60.7 0 96 0L229.5 0c17 0 33.3 6.7 45.3 18.7L397.3 141.3c12 12 18.7 28.3 18.7 45.3l0 149.5-48 0 0-128-88 0c-39.8 0-72-32.2-72-72l0-88zM348.1 160L256 67.9 256 136c0 13.3 10.7 24 24 24l68.1 0zM240 380l32 0c33.1 0 60 26.9 60 60s-26.9 60-60 60l-12 0 0 28c0 11-9 20-20 20s-20-9-20-20l0-128c0-11 9-20 20-20zm32 80c11 0 20-9 20-20s-9-20-20-20l-12 0 0 40 12 0zm96-80l32 0c28.7 0 52 23.3 52 52l0 64c0 28.7-23.3 52-52 52l-32 0c-11 0-20-9-20-20l0-128c0-11 9-20 20-20zm32 128c6.6 0 12-5.4 12-12l0-64c0-6.6-5.4-12-12-12l-12 0 0 88 12 0zm76-108c0-11 9-20 20-20l48 0c11 0 20 9 20 20s-9 20-20 20l-28 0 0 24 28 0c11 0 20 9 20 20s-9 20-20 20l-28 0 0 44c0 11-9 20-20 20s-20-9-20-20l0-128z" />
                            </svg>
                            Ver
                          </button>
                          <button
                            type="button"
                            className="att-reporte-action-btn att-reporte-action-btn--send"
                            disabled={(() => {
                              if (informeYaEnviadoHoyColombia(e)) return true;
                              if (!e.informe) return true;
                              if (!envioInformePermitidoPorApi) return true;
                              if (ventanaCargando) return true;
                              if (ventanaFallo) return true;
                              if (enviarMutation.isPending) return true;
                              return false;
                            })()}
                            onClick={(evt) => {
                              evt.stopPropagation();
                              enviarMutation.mutate({
                                id: e.id,
                                correo: testEmail,
                                identificacion: selectedDoc,
                              });
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                              <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.8" />
                              <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                            {enviarMutation.isPending && Number(enviarMutation.variables?.id) === Number(e.id)
                              ? 'Enviando…'
                              : 'Enviar'}
                          </button>
                        </div>
                        <div className="d-flex justify-content-end mt-2">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              setSelectedEvalId(e.id);
                              setDetailEval(e);
                            }}
                          >
                            Ver detalle
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="d-grid gap-3">
              {!selectedParticipant ? (
                <div className="att-reportes-empty">Selecciona un estudiante para crear la evaluación.</div>
              ) : (
                <>
                  <div className="att-reportes-student">
                    <div>
                      <h4 className="h5 fw-bold mb-1">{getNombreCompleto(selectedParticipant)}</h4>
                      <p className="small mb-0">{cursoLabel(selectedCurso)}</p>
                    </div>
                    <label className="att-reportes-photo-frame" aria-label="Subir foto">
                      <input
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFotoFile(file);
                          if (!file) {
                            setPreviewUrl((prev) => {
                              revokeObjectUrlIfBlob(prev);
                              return '';
                            });
                            return;
                          }
                          setPreviewUrl((prev) => {
                            revokeObjectUrlIfBlob(prev);
                            return URL.createObjectURL(file);
                          });
                        }}
                      />
                      {previewUrl ? (
                        <img src={previewUrl} alt="Vista previa participante" className="att-reportes-photo-preview" />
                      ) : (
                        <div className="att-reportes-photo-placeholder">
                          <svg viewBox="0 0 24 24" width="42" height="42" fill="none">
                            <path d="M4 8h4l2-2h4l2 2h4v10H4z" stroke="currentColor" strokeWidth="1.8" />
                            <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
                          </svg>
                          <span>Sin foto</span>
                        </div>
                      )}
                    </label>
                  </div>
                  <div>
                    <label className="form-label fw-semibold">Comentario del entrenador</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Agregar comentario general..."
                    />
                  </div>
                  <div className="d-grid gap-2">
                    {rubricasActivas.map((r) => (
                      <div key={r.id} className="att-reportes-rubrica-editor">
                        <h5 className="mb-1">{r.nombre}</h5>
                        <p className="small text-muted mb-2">{r.descripcion}</p>
                        <div className="att-reportes-niveles">
                          {[
                            { key: 'alto', title: 'Satisfactorio Alto', desc: r.alto || '—' },
                            { key: 'medio', title: 'Satisfactorio Básico', desc: r.medio || '—' },
                            { key: 'bajo', title: 'En Proceso de Desarrollo', desc: r.bajo || '—' },
                          ].map((nivel) => (
                            <button
                              key={nivel.key}
                              type="button"
                              className={`att-reportes-nivel ${niveles[r.id] === nivel.key ? 'is-selected' : ''}`}
                              onClick={() => setNiveles((prev) => ({ ...prev, [r.id]: nivel.key }))}
                            >
                              <strong>{nivel.title}</strong>
                              <span>{nivel.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          </div>

          {tab === 'crear' && selectedParticipant ? (
            rubricasActivas.length > 0 ? (
              <div className="att-reportes-save-bar" role="region" aria-label="Guardar evaluación">
                {editingEvalId ? (
                  <p className="small text-muted mb-0 me-auto">
                    Pulsa <strong>Guardar evaluación</strong> para actualizar el informe.
                  </p>
                ) : (
                  <div className="att-reportes-save-bar__progress">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                      <span className="small fw-semibold text-body-secondary">
                        Progreso: {rubricasCompletas} de {totalRubricas} rúbricas
                      </span>
                      <span className="small text-muted">{progresoPct}%</span>
                    </div>
                    <div className="att-reportes-progress-track" aria-hidden="true">
                      <div className="att-reportes-progress-fill" style={{ width: `${progresoPct}%` }} />
                    </div>
                    <p className="small text-muted mb-0 mt-2">
                      Todas las rúbricas son obligatorias. Pulsa <strong>Guardar evaluación</strong> para registrar el informe.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm att-reportes-save-bar__btn"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar evaluación'}
                </button>
              </div>
            ) : (
              <div className="att-reportes-save-bar" role="status">
                <p className="small text-muted mb-0">No hay rúbricas activas para esta categoría; no se puede guardar la evaluación.</p>
              </div>
            )
          ) : null}
          </div>
        </section>
      </div>

      <SuccessModal
        open={Boolean(successData)}
        onClose={() => setSuccessData(null)}
        onViewPdf={() => successData?.informe && window.open(apiUrl(successData.informe), '_blank', 'noopener,noreferrer')}
        onSendMail={() => {
          if (!successData?.id) return;
          enviarMutation.mutate({
            id: successData.id,
            correo: testEmail,
            identificacion: selectedDoc,
          });
        }}
        correoDestino={testEmail}
        envioInformePermitido={envioInformePermitidoPorApi}
        ventanaCargando={ventanaCargando}
        bloqueoMensaje={mensajeVentanaEnvioInforme(ventanaVentana)}
        yaEnviadoHoy={Boolean(successData && informeYaEnviadoHoyColombia(successData))}
        isSending={
          Boolean(successData?.id) &&
          enviarMutation.isPending &&
          Number(enviarMutation.variables?.id) === Number(successData?.id)
        }
      />
      <EvalDetailModal open={Boolean(detailEval)} evaluacion={detailEval} onClose={() => setDetailEval(null)} />
      {toastState.show ? (
        <div className={`att-toast att-toast--${toastState.type === 'danger' ? 'error' : 'success'}`} role="status">
          <div className="att-toast__icon" aria-hidden="true">
            {toastState.type === 'danger' ? '!' : '✓'}
          </div>
          <p className="att-toast__text">{toastState.message}</p>
          <button
            type="button"
            className="att-toast__close"
            aria-label="Cerrar notificación"
            onClick={() => setToastState((prev) => ({ ...prev, show: false }))}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
