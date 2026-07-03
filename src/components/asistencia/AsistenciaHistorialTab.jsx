import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api.js';
import { formatFechaCorta } from '../../lib/formatDate.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';

function fmtFecha(v) {
  return formatFechaCorta(v);
}

function exportAsExcelLikeCsv(rows) {
  const header = [
    'Fecha',
    'Hora',
    'Participante',
    'Documento',
    'Curso',
    'Responsable',
    'Estado',
    'Comentarios',
    'Ruta',
  ];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    lines.push(
      [
        fmtFecha(r.fecha),
        r.hora || '',
        r.nombre || '',
        r.documento || '',
        r.curso || '',
        r.responsable || '',
        r.reporte || '',
        r.comentarios || '',
        r.ruta || '',
      ]
        .map(escape)
        .join(','),
    );
  }
  const csv = `\uFEFF${lines.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_asistencia_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AsistenciaHistorialTab({ enabled = true }) {
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate(),
      ).padStart(2, '0')}`,
    [today],
  );
  const defaultStart = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  }, [today]);
  const [q, setQ] = useState('');
  const [fechaInicio, setFechaInicio] = useState(defaultStart);
  const [fechaFin, setFechaFin] = useState(defaultEnd);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const historialQuery = useQuery({
    queryKey: ['historial', { fechaInicio, fechaFin }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (fechaInicio) p.set('fechaInicio', fechaInicio);
      if (fechaFin) p.set('fechaFin', fechaFin);
      return getJson(`/api/asistencia?${p.toString()}`);
    },
    enabled,
  });

  const data = useMemo(() => historialQuery.data?.asistencia || [], [historialQuery.data]);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const nq = normalizeForSearch(q);
    return data.filter((r) => {
      const blob = normalizeForSearch(
        `${r.nombre || ''} ${r.documento || ''} ${r.curso || ''} ${r.reporte || ''} ${r.ruta || ''}`,
      );
      return blob.includes(nq);
    });
  }, [data, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliceStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(sliceStart, sliceStart + pageSize);

  return (
    <div className="att-history-card">
      <h3 className="h6 m-0 fw-bold text-muted mb-3">Historial de asistencia</h3>

      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3 att-info-toolbar">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="small text-muted">Mostrar</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 86 }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="small text-muted">registros</span>
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={() => exportAsExcelLikeCsv(filtered)}
          >
            Exportar Excel
          </button>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <label className="small text-muted d-flex align-items-center gap-1">
            <span>Fecha inicio</span>
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
          <label className="small text-muted d-flex align-items-center gap-1">
            <span>Fecha fin</span>
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
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ width: 220 }}
            placeholder="Buscar"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {historialQuery.isPending ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : historialQuery.isError ? (
        <div className="alert alert-danger small">{historialQuery.error?.message}</div>
      ) : (
        <>
          <div className="table-responsive att-info-table-wrap">
            <table className="table table-sm align-middle att-history-table att-history-table--enhanced">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Participante</th>
                  <th>Documento</th>
                  <th>Curso</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Comentarios</th>
                  <th>Ruta</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, idx) => (
                  <tr key={`${r.fecha}-${r.hora}-${r.documento}-${idx}`}>
                    <td data-label="Fecha">{fmtFecha(r.fecha)}</td>
                    <td data-label="Hora">{r.hora || '—'}</td>
                    <td data-label="Participante">{r.nombre || '—'}</td>
                    <td data-label="Documento">{r.documento || '—'}</td>
                    <td data-label="Curso">{r.curso || '—'}</td>
                    <td data-label="Responsable">{r.responsable || '—'}</td>
                    <td data-label="Estado">{r.reporte || '—'}</td>
                    <td data-label="Comentarios">{r.comentarios || '-'}</td>
                    <td data-label="Ruta">{r.ruta || 'No asignada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center small text-muted">
            <span>
              Mostrando {filtered.length === 0 ? 0 : sliceStart + 1} a{' '}
              {Math.min(sliceStart + pageSize, filtered.length)} de {filtered.length} registros
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
  );
}
