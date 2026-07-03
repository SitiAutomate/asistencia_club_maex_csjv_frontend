import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api.js';
import { formatFechaCorta } from '../../lib/formatDate.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';

const TIPO_LABEL = {
  REGULAR: 'Regular',
  DIAGNOSTICO: 'Diagnóstico',
  INFORME_FINAL: 'Informe final',
};

function defaultRangoFechas() {
  const today = new Date();
  const fin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const desde = new Date(today);
  desde.setMonth(desde.getMonth() - 3);
  const inicio = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-${String(desde.getDate()).padStart(2, '0')}`;
  return { inicio, fin };
}

function exportCsv(rows) {
  const header = [
    'Fecha',
    'Hora',
    'Participante',
    'Documento',
    'Asignatura',
    'Sede',
    'Sesión',
    'Maestro',
    'Tipo',
    'Horas',
    'Asistió',
    'Comentarios',
    'Registrado por',
  ];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    lines.push(
      [
        formatFechaCorta(r.fecha),
        r.hora || '',
        r.nombre || '',
        r.documento || '',
        r.nombre_asignatura || '',
        r.sede || '',
        r.sesion || '',
        r.maestro_nombre || '',
        TIPO_LABEL[r.tipo_registro] || r.tipo_registro || '',
        r.horas_asistidas ?? '',
        r.asistio ? 'Sí' : 'No',
        r.comentarios || '',
        r.registrado_por || '',
      ]
        .map(escape)
        .join(','),
    );
  }
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lvlup_historial_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function LvlupHistorialTab({ isAdmin, maestros = [], asignaciones = [] }) {
  const rango = useMemo(() => defaultRangoFechas(), []);
  const [fechaInicio, setFechaInicio] = useState(rango.inicio);
  const [fechaFin, setFechaFin] = useState(rango.fin);
  const [maestroId, setMaestroId] = useState('');
  const [asignacionId, setAsignacionId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const historialQuery = useQuery({
    queryKey: ['lvlup-historial', fechaInicio, fechaFin, maestroId, asignacionId],
    queryFn: () => {
      const p = new URLSearchParams({ fechaInicio, fechaFin });
      if (maestroId) p.set('maestroId', maestroId);
      if (asignacionId) p.set('asignacionId', asignacionId);
      return getJson(`/api/lvlup/historial?${p}`);
    },
    staleTime: 30_000,
  });

  const registros = historialQuery.data?.registros || [];

  const filtered = useMemo(() => {
    if (!q.trim()) return registros;
    const nq = normalizeForSearch(q);
    return registros.filter((r) => {
      const blob = normalizeForSearch(
        `${r.nombre} ${r.documento} ${r.nombre_asignatura} ${r.maestro_nombre} ${r.grupo_nombre} ${r.comentarios} ${r.sesion}`,
      );
      return blob.includes(nq);
    });
  }, [registros, q]);

  const totalHoras = useMemo(
    () => filtered.reduce((acc, r) => acc + Number(r.horas_asistidas || 0), 0),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="att-lvlup-historial">
      <div className="att-lvlup-historial__toolbar att-info-toolbar">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <label className="small text-muted d-flex align-items-center gap-1 mb-0">
            Desde
            <input
              type="date"
              className="form-control form-control-sm"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="small text-muted d-flex align-items-center gap-1 mb-0">
            Hasta
            <input
              type="date"
              className="form-control form-control-sm"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {isAdmin ? (
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '10rem' }}
              value={maestroId}
              onChange={(e) => {
                setMaestroId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los maestros</option>
              {maestros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          ) : null}
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', minWidth: '12rem' }}
            value={asignacionId}
            onChange={(e) => {
              setAsignacionId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las asignaciones</option>
            {asignaciones.map((a) => (
              <option key={a.asignacion_id} value={a.asignacion_id}>
                {a.nombre_asignatura || a.id_asignatura} · {a.sesion}
                {isAdmin && a.maestro_nombre ? ` · ${a.maestro_nombre}` : ''}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ width: 200 }}
            placeholder="Buscar…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-muted">
            {filtered.length} registro{filtered.length === 1 ? '' : 's'} · {totalHoras}h
          </span>
          <select
            className="form-select form-select-sm"
            style={{ width: 72 }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            type="button"
            className="btn btn-success btn-sm"
            disabled={!filtered.length}
            onClick={() => exportCsv(filtered)}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {historialQuery.isPending ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : null}

      {historialQuery.isError ? (
        <p className="text-danger small mb-0">
          {historialQuery.error?.message || 'No se pudo cargar el historial'}
        </p>
      ) : null}

      {!historialQuery.isPending && !filtered.length ? (
        <p className="text-muted small text-center py-5 mb-0">
          No hay registros en el rango seleccionado.
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <>
          <div className="att-lvlup-historial__table-wrap">
            <table className="table table-sm att-history-table att-history-table--enhanced att-lvlup-historial__table mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Participante</th>
                  <th>Asignatura</th>
                  {isAdmin ? <th>Maestro</th> : null}
                  <th>Sesión</th>
                  <th>Tipo</th>
                  <th>Horas</th>
                  <th>Asistió</th>
                  <th>Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Fecha">{formatFechaCorta(r.fecha)}</td>
                    <td data-label="Hora">{String(r.hora || '').slice(0, 5)}</td>
                    <td data-label="Participante">
                      <div className="fw-semibold">{r.nombre || '—'}</div>
                      <div className="small text-muted">{r.documento}</div>
                    </td>
                    <td data-label="Asignatura">
                      {r.nombre_asignatura || '—'}
                      <div className="small text-muted">{r.sede}</div>
                    </td>
                    {isAdmin ? <td data-label="Maestro">{r.maestro_nombre || '—'}</td> : null}
                    <td data-label="Sesión">
                      {r.sesion}
                      {r.grupo_nombre ? (
                        <div className="small text-muted">{r.grupo_nombre}</div>
                      ) : null}
                    </td>
                    <td data-label="Tipo">{TIPO_LABEL[r.tipo_registro] || r.tipo_registro}</td>
                    <td data-label="Horas">{r.horas_asistidas}</td>
                    <td data-label="Asistió">
                      <span
                        className={`att-lvlup-historial__badge ${r.asistio ? 'is-yes' : 'is-no'}`}
                      >
                        {r.asistio ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td data-label="Comentarios" className="att-lvlup-historial__comentario">
                      {r.comentarios || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="att-lvlup-historial__pager">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="small text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
