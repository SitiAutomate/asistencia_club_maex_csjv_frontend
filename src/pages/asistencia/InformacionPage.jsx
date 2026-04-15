import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { getCursoNombre, getDocumento, getNombreCompleto, getParticipante } from '../../lib/inscritoHelpers.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';

function cursoId(c) {
  return String(c?.ID_Curso ?? c?.id_curso ?? '').trim();
}

function cursoLabel(c) {
  return c?.Nombre_del_curso || c?.nombre_del_curso || c?.Nombre_Corto_Curso || c?.nombre_corto_curso || '';
}

function fmtFechaCorta(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('es-CO');
}

function toCsvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportInfoCsv(rows) {
  const headers = [
    'Estado',
    'Participante',
    'Documento',
    'Curso',
    'Grupo',
    'F. Nacimiento',
    'Madre',
    'Tel. Madre',
    'Email Madre',
    'Padre',
    'Tel. Padre',
    'Email Padre',
  ];
  const lines = [headers.map(toCsvValue).join(',')];
  rows.forEach((inscrito) => {
    const p = getParticipante(inscrito) || {};
    const padreInfo = p?.padreInfo || {};
    lines.push(
      [
        inscrito?.Estado || '',
        getNombreCompleto(inscrito),
        getDocumento(inscrito),
        getCursoNombre(inscrito),
        p?.grupo || '',
        fmtFechaCorta(p?.fechaNacimiento),
        padreInfo?.nombreMadre || '',
        padreInfo?.celularMadre || '',
        padreInfo?.emailMadre || '',
        padreInfo?.nombrePadre || '',
        padreInfo?.celularPadre || '',
        padreInfo?.emailPadre || '',
      ]
        .map(toCsvValue)
        .join(','),
    );
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `informacion_participantes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CursoSearchSelect({ cursos, value, onChange, allowAll = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const selected = cursos.find((c) => cursoId(c) === String(value || '')) || null;

  const q = normalizeForSearch(search);
  const filtered = q ? cursos.filter((c) => normalizeForSearch(cursoLabel(c)).includes(q)) : cursos;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className={`att-rubrica-select ${open ? 'is-open' : ''}`} ref={ref}>
      <button type="button" className="att-rubrica-select__trigger" onClick={() => setOpen((v) => !v)}>
        {selected ? cursoLabel(selected) : allowAll ? 'Todos los cursos' : 'Selecciona un curso'}
      </button>
      {open ? (
        <div className="att-rubrica-select__menu">
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Buscar curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="att-rubrica-select__options">
            {allowAll ? (
              <button
                type="button"
                className={`att-rubrica-select__option ${String(value || '') === '' ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Todos los cursos
              </button>
            ) : null}
            {filtered.map((c) => {
              const id = cursoId(c);
              return (
                <button
                  key={id}
                  type="button"
                  className={`att-rubrica-select__option ${id === String(value || '') ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
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
  );
}

export function InformacionPage() {
  const { user } = useOutletContext() || {};
  const email = user?.email || '';
  const isAdmin = String(user?.rol || '').trim() === 'Administrador';
  const navEnabled = isNavKeyEnabled('informacion');

  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const cursosQuery = useQuery({
    queryKey: ['informacion-cursos', email],
    queryFn: () =>
      isAdmin
        ? getJson(`/api/cursos?scope=all&correo=${encodeURIComponent(email)}`)
        : getJson(`/api/cursos?correo=${encodeURIComponent(email)}&soloMisCursos=true`),
    enabled: Boolean(email),
    staleTime: 5 * 60_000,
  });

  const cursos = useMemo(() => cursosQuery.data?.cursos || [], [cursosQuery.data]);
  const defaultCursoId = useMemo(() => cursoId(cursos[0]), [cursos]);
  const effectiveCursoId = isAdmin ? selectedCursoId : selectedCursoId || defaultCursoId;

  const infoQuery = useQuery({
    queryKey: ['informacion-inscritos', effectiveCursoId],
    queryFn: () => {
      const u = new URLSearchParams({
        estado: 'CONFIRMADO,INCAPACITADO,RETIRADO',
        withRutaExtra: 'false',
      });
      if (effectiveCursoId) u.set('idCurso', effectiveCursoId);
      return getJson(`/api/inscritos?${u.toString()}`);
    },
    enabled: Boolean(email) && (isAdmin || Boolean(effectiveCursoId)),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  const rows = useMemo(() => infoQuery.data?.inscritos || [], [infoQuery.data]);
  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    const list = [...rows].sort((a, b) =>
      getNombreCompleto(a).localeCompare(getNombreCompleto(b), 'es', { sensitivity: 'base' }),
    );
    if (!q) return list;
    return list.filter((i) => {
      const p = getParticipante(i) || {};
      const padre = p?.padreInfo || {};
      const blob = normalizeForSearch(
        `${i?.Estado} ${getNombreCompleto(i)} ${getDocumento(i)} ${getCursoNombre(i)} ${p?.grupo} ${padre?.nombreMadre} ${padre?.nombrePadre} ${padre?.emailMadre} ${padre?.emailPadre}`,
      );
      return blob.includes(q);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const paged = useMemo(
    () => filtered.slice(sliceStart, sliceStart + pageSize),
    [filtered, sliceStart, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [effectiveCursoId, search, pageSize]);

  if (!navEnabled) return <Navigate to={getDefaultAppPath()} replace />;

  return (
    <div className="att-main">
      <div className="att-history-card">
        <h2 className="h4 m-0 fw-bold mb-2" style={{ color: '#3d8dd4' }}>
          Participantes
        </h2>
        <hr className="mt-2 mb-3" />

        <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-2 att-info-toolbar att-info-toolbar--filters">
          <div className="d-flex align-items-center gap-2">
            <label className="small mb-0">Curso:</label>
            <div className="att-info-course-picker-wrap">
              <CursoSearchSelect
                cursos={cursos}
                value={selectedCursoId}
                onChange={setSelectedCursoId}
                allowAll={isAdmin}
              />
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small">Buscar:</span>
            <input
              type="search"
              className="form-control form-control-sm att-info-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Nombre, doc, curso..."
            />
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 att-info-toolbar att-info-toolbar--table">
          <div className="d-flex align-items-center gap-2 small text-muted">
            <span>Mostrar</span>
            <select
              className="form-select form-select-sm att-info-page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>registros</span>
          </div>
          <button type="button" className="btn btn-success btn-sm" onClick={() => exportInfoCsv(filtered)}>
            Exportar Excel
          </button>
        </div>

        {cursosQuery.isPending || (infoQuery.isPending && !infoQuery.data?.inscritos) ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : cursosQuery.isError || infoQuery.isError ? (
          <div className="alert alert-danger small">
            {cursosQuery.error?.message || infoQuery.error?.message || 'No se pudo cargar la información.'}
          </div>
        ) : (
          <>
          {infoQuery.isFetching ? <div className="small text-muted mb-2">Actualizando datos...</div> : null}
          <div className="table-responsive att-info-table-wrap">
            <table className="table table-sm align-middle att-history-table att-info-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Curso</th>
                  <th>Grupo</th>
                  <th>F. Nacimiento</th>
                  <th>Madre</th>
                  <th>Tel. Madre</th>
                  <th>Email Madre</th>
                  <th>Padre</th>
                  <th>Tel. Padre</th>
                  <th>Email Padre</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((inscrito) => {
                  const p = getParticipante(inscrito) || {};
                  const padreInfo = p?.padreInfo || {};
                  return (
                    <tr key={`${getDocumento(inscrito)}-${cursoId(inscrito?.curso)}`}>
                      <td data-label="Estado">{inscrito?.Estado || '—'}</td>
                      <td data-label="Participante">{getNombreCompleto(inscrito) || '—'}</td>
                      <td data-label="Documento">{getDocumento(inscrito) || '—'}</td>
                      <td data-label="Curso">{getCursoNombre(inscrito) || '—'}</td>
                      <td data-label="Grupo">{p?.grupo || '—'}</td>
                      <td data-label="F. Nacimiento">{fmtFechaCorta(p?.fechaNacimiento)}</td>
                      <td data-label="Madre">{padreInfo?.nombreMadre || '—'}</td>
                      <td data-label="Tel. Madre">{padreInfo?.celularMadre || '—'}</td>
                      <td data-label="Email Madre">{padreInfo?.emailMadre || '—'}</td>
                      <td data-label="Padre">{padreInfo?.nombrePadre || '—'}</td>
                      <td data-label="Tel. Padre">{padreInfo?.celularPadre || '—'}</td>
                      <td data-label="Email Padre">{padreInfo?.emailPadre || '—'}</td>
                    </tr>
                  );
                })}
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center text-muted py-3">
                      No hay participantes para mostrar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center small text-muted mt-2 att-info-pagination">
            <span>
              Mostrando {filtered.length === 0 ? 0 : sliceStart + 1} a {Math.min(sliceStart + pageSize, filtered.length)} de {filtered.length} registros
            </span>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-light btn-sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="badge text-bg-primary">{currentPage}</span>
              <button
                type="button"
                className="btn btn-light btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
