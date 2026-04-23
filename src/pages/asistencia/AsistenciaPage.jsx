import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, postJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { matchesParticipantName, normalizeForSearch } from '../../lib/normalizeSearch.js';
import {
  buildAsistenciaBody,
  getDocumento,
  getIdCurso,
  getNombreCompleto,
} from '../../lib/inscritoHelpers.js';
import { ParticipantCard } from '../../components/asistencia/ParticipantCard.jsx';
import { ExcusaModal } from '../../components/asistencia/ExcusaModal.jsx';
import { ParticipantDetailModal } from '../../components/asistencia/ParticipantDetailModal.jsx';
import { IconSearch } from '../../components/asistencia/AttendanceIcons.jsx';
import { whatsappHref } from '../../lib/phoneLinks.js';

function rowKey(inscrito) {
  return `${String(getIdCurso(inscrito) || '').trim()}-${String(getDocumento(inscrito) || '').trim()}`;
}

function cursoLabel(c) {
  return c?.Nombre_del_curso || c?.nombre_del_curso || c?.Nombre_Corto_Curso || c?.nombre_corto_curso || c?.ID_Curso || '';
}

function cursoId(c) {
  return String(c?.ID_Curso ?? c?.id_curso ?? '').trim();
}

function isToday(value) {
  if (!value) return false;
  // API devuelve YYYY-MM-DD; comparar como string evita desfases por zona horaria.
  const raw = String(value).slice(0, 10);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return raw === `${y}-${m}-${d}`;
}

export function AsistenciaPage() {
  const { user } = useOutletContext() || {};
  const email = user?.email || '';
  const isAdmin = String(user?.rol || '').trim() === 'Administrador';

  const [courseId, setCourseId] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseOpen, setCourseOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [excusaInscrito, setExcusaInscrito] = useState(null);
  const [localReport, setLocalReport] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const coursePickerRef = useRef(null);
  const supportWhatsApp = import.meta.env.VITE_SUPPORT_WHATSAPP || '';
  const supportWhatsAppUrl = whatsappHref(supportWhatsApp);
  const inscritosEstados = 'CONFIRMADO,ACTIVO';

  const cursosQuery = useQuery({
    queryKey: ['cursos', email],
    queryFn: () => getJson(`/api/cursos?correo=${encodeURIComponent(email)}`),
    enabled: Boolean(email),
    staleTime: 5 * 60_000,
  });
  const hasAsignacion = cursosQuery.isSuccess && (cursosQuery.data?.cursos || []).length > 0;
  const cursosAsignados = useMemo(() => cursosQuery.data?.cursos || [], [cursosQuery.data]);
  const defaultCourseId = useMemo(() => cursoId(cursosAsignados[0]), [cursosAsignados]);
  const canViewAllByDefault = isAdmin || Boolean(cursosQuery.data?.tieneApoyoGlobal);
  const effectiveCourseId = canViewAllByDefault ? courseId : courseId || defaultCourseId;
  const selectedFilterCourseId = canViewAllByDefault ? courseId : effectiveCourseId;

  const inscritosQuery = useQuery({
    queryKey: canViewAllByDefault
      ? ['inscritos', { estado: inscritosEstados, withRutaExtra: true, scope: 'all' }]
      : ['inscritos', { estado: inscritosEstados, withRutaExtra: true, idCurso: effectiveCourseId || null }],
    queryFn: () => {
      const u = new URLSearchParams({ estado: inscritosEstados, withRutaExtra: 'true' });
      if (!canViewAllByDefault && effectiveCourseId) u.set('idCurso', effectiveCourseId);
      return getJson(`/api/inscritos?${u.toString()}`);
    },
    enabled: Boolean(email) && hasAsignacion && (canViewAllByDefault || Boolean(effectiveCourseId)),
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  const asistenciaQuery = useQuery({
    queryKey: ['asistencia-hoy'],
    queryFn: () => getJson('/api/asistencia'),
    enabled: Boolean(email),
  });

  const reportMut = useMutation({
    mutationFn: (body) => postJson('/api/asistencia', body),
  });

  const reportFromApi = useMemo(() => {
    const arr = Array.isArray(asistenciaQuery.data?.asistencia) ? asistenciaQuery.data.asistencia : [];
    const map = {};
    for (const item of arr) {
      if (!isToday(item.fecha)) continue;
      const k = `${String(item.idcurso || '').trim()}-${String(item.documento || '').trim()}`;
      if (!map[k]) map[k] = { reporte: item.reporte, comentarios: item.comentarios || '' };
    }
    return map;
  }, [asistenciaQuery.data]);

  const fireReport = (inscrito, reporte, comentarios = '', onAfter) => {
    if (!user?.email) return;
    const body = buildAsistenciaBody(inscrito, user.email, reporte, comentarios);
    const k = rowKey(inscrito);
    setBusyKey(k);
    reportMut.mutate(body, {
      onSuccess: () => {
        setLocalReport((prev) => ({ ...prev, [k]: { reporte, comentarios } }));
        queryClient.invalidateQueries({ queryKey: ['asistencia-hoy'] });
        onAfter?.();
      },
      onSettled: () => setBusyKey(null),
    });
  };

  const filtered = useMemo(() => {
    const list = inscritosQuery.data?.inscritos || [];
    const byCourse = selectedFilterCourseId
      ? list.filter((i) => String(getIdCurso(i) || '').trim() === String(selectedFilterCourseId).trim())
      : list;
    const byName = byCourse
      .filter((i) => matchesParticipantName(getNombreCompleto(i), search))
      .sort((a, b) =>
        getNombreCompleto(a).localeCompare(getNombreCompleto(b), 'es', {
          sensitivity: 'base',
        }),
      );

    // Evita keys duplicadas en React cuando el backend trae filas repetidas
    // para el mismo participante+curso.
    const unique = [];
    const seen = new Set();
    const duplicates = [];
    for (const item of byName) {
      const k = rowKey(item);
      if (seen.has(k)) {
        duplicates.push(k);
        continue;
      }
      seen.add(k);
      unique.push(item);
    }

    if (duplicates.length > 0 && import.meta.env.DEV) {
      // Log temporal de diagnóstico para detectar origen de duplicados/mezclas.
      console.warn('[AsistenciaPage] inscritos duplicados detectados', {
        selectedFilterCourseId: selectedFilterCourseId || 'ALL',
        search,
        duplicates: [...new Set(duplicates)],
        totalBeforeDedup: byName.length,
        totalAfterDedup: unique.length,
      });
    }

    return unique;
  }, [inscritosQuery.data, search, selectedFilterCourseId]);

  const cursos = useMemo(() => {
    const all = cursosQuery.data?.cursos || [];
    const q = normalizeForSearch(courseSearch);
    if (!q) return all;
    return all.filter((c) => normalizeForSearch(cursoLabel(c)).includes(q));
  }, [cursosQuery.data, courseSearch]);

  useEffect(() => {
    if (!courseOpen) return undefined;
    const onDown = (event) => {
      if (!coursePickerRef.current) return;
      if (!coursePickerRef.current.contains(event.target)) {
        setCourseOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [courseOpen]);

  if (!isNavKeyEnabled('asistencia')) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  if (!email) {
    return (
      <div className="att-main">
        <p className="text-muted">No se encontró el correo de la sesión.</p>
      </div>
    );
  }

  return (
    <>
      <div className="att-toolbar att-toolbar--sticky">
        <div ref={coursePickerRef} className={`att-course-picker ${courseOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="att-select-curso att-course-trigger"
            onClick={() => setCourseOpen((v) => !v)}
            aria-label="Abrir selector de curso"
            aria-expanded={courseOpen}
          >
            {courseId
              ? cursoLabel((cursosQuery.data?.cursos || []).find((c) => cursoId(c) === courseId) || {})
              : effectiveCourseId
                ? cursoLabel((cursosQuery.data?.cursos || []).find((c) => cursoId(c) === effectiveCourseId) || {})
                : canViewAllByDefault
                  ? 'Todos los cursos'
                  : 'Selecciona un curso'}
          </button>
          {courseOpen ? (
            <div className="att-course-dropdown">
              <div className="att-search-wrap">
                <span className="att-search-icon">
                  <IconSearch />
                </span>
                <input
                  type="search"
                  className="att-search-input att-course-search"
                  placeholder="Buscar curso..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  aria-label="Buscar curso"
                />
              </div>
              <div className="att-course-list">
                {canViewAllByDefault ? (
                  <button
                    type="button"
                    className={`att-course-option ${courseId === '' ? 'is-selected' : ''}`}
                    onClick={() => {
                      setCourseId('');
                      setCourseOpen(false);
                    }}
                  >
                    Todos los cursos
                  </button>
                ) : null}
                {cursos.map((c) => {
                  const id = cursoId(c);
                  if (!id) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`att-course-option ${
                        (canViewAllByDefault ? courseId : courseId || effectiveCourseId) === id ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        setCourseId(id);
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
        <div className="att-search-wrap">
          <span className="att-search-icon">
            <IconSearch />
          </span>
          <input
            type="search"
            className="att-search-input"
            placeholder="Buscar participante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar participante"
          />
        </div>
      </div>

      <div className="att-main">
        {inscritosQuery.isError && (
          <div className="alert alert-danger small">{inscritosQuery.error?.message}</div>
        )}
        {cursosQuery.isError && (
          <div className="alert alert-warning small">{cursosQuery.error?.message}</div>
        )}
        {reportMut.isError && (
          <div className="alert alert-danger small">{reportMut.error?.message}</div>
        )}

        {hasAsignacion && inscritosQuery.isPending && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        )}

        {hasAsignacion && !inscritosQuery.isPending && (
          <>
            {inscritosQuery.isFetching && (
              <div className="att-subtle-loading" role="status" aria-live="polite">
                <span className="att-subtle-loading__spinner" aria-hidden="true" />
                <span>Actualizando participantes...</span>
              </div>
            )}
            <div className="att-grid">
              {filtered.map((inscrito) => {
                const k = rowKey(inscrito);
                const activeEntry = localReport[k] || reportFromApi[k] || null;
                return (
                  <ParticipantCard
                    key={k}
                    inscrito={inscrito}
                    onOpenDetail={setDetail}
                    onReport={(i, r) => fireReport(i, r, '')}
                    onExcusa={setExcusaInscrito}
                    busy={busyKey === k && reportMut.isPending}
                    activeEntry={activeEntry}
                    estado={inscrito?.Estado || inscrito?.estado}
                  />
                );
              })}
            </div>
          </>
        )}

        {hasAsignacion && !inscritosQuery.isPending && filtered.length === 0 && (
          <p className="text-muted text-center py-4">No hay participantes para mostrar.</p>
        )}

        {cursosQuery.isSuccess && !hasAsignacion && (
          <div className="alert alert-warning text-center py-3 my-3">
            <p className="mb-2">No tienes asignación, comunícate con soporte.</p>
            {supportWhatsAppUrl ? (
              <a href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="fw-semibold">
                WhatsApp: {supportWhatsApp}
              </a>
            ) : (
              <span className="fw-semibold">Configura VITE_SUPPORT_WHATSAPP en el .env</span>
            )}
          </div>
        )}
      </div>

      <ParticipantDetailModal open={Boolean(detail)} inscrito={detail} onClose={() => setDetail(null)} />

      <ExcusaModal
        key={excusaInscrito ? rowKey(excusaInscrito) : 'excusa-cerrada'}
        open={Boolean(excusaInscrito)}
        participantName={excusaInscrito ? getNombreCompleto(excusaInscrito) : ''}
        onClose={() => !reportMut.isPending && setExcusaInscrito(null)}
        isPending={Boolean(excusaInscrito && busyKey === rowKey(excusaInscrito) && reportMut.isPending)}
        onConfirm={(comentarios) => {
          if (!excusaInscrito) return;
          fireReport(excusaInscrito, 'Excusa', comentarios, () => setExcusaInscrito(null));
        }}
      />
    </>
  );
}
