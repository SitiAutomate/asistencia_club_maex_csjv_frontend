import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';

/** YYYY-MM-DD como medianoche UTC hace que en CO se vea el día anterior; parsear como fecha local. */
function parseFechaCalendarioLocal(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const local = new Date(y, mo, d);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtFecha(v) {
  if (!v) return '—';
  const d = parseFechaCalendarioLocal(v);
  if (!d) return String(v).slice(0, 10);
  return d.toLocaleDateString('es-CO');
}

function normalizeReport(value) {
  return normalizeForSearch(String(value || ''));
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

export function HistorialPage() {
  const { user } = useOutletContext() || {};
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
  const [tab, setTab] = useState('tabla');
  const [q, setQ] = useState('');
  const [fechaInicio, setFechaInicio] = useState(defaultStart);
  const [fechaFin, setFechaFin] = useState(defaultEnd);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantKey, setParticipantKey] = useState('');
  const navEnabled = isNavKeyEnabled('historial');

  const historialQuery = useQuery({
    queryKey: ['historial', { fechaInicio, fechaFin }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (fechaInicio) p.set('fechaInicio', fechaInicio);
      if (fechaFin) p.set('fechaFin', fechaFin);
      return getJson(`/api/asistencia?${p.toString()}`);
    },
    enabled: Boolean(user?.email),
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

  const monthRows = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth();
    return data.filter((row) => {
      const d = parseFechaCalendarioLocal(row.fecha);
      return d && d.getFullYear() === y && d.getMonth() === m;
    });
  }, [data, today]);

  const participants = useMemo(() => {
    const map = new Map();
    for (const row of monthRows) {
      const key = `${row.documento || ''}__${row.nombre || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          documento: row.documento || '',
          nombre: row.nombre || 'Sin nombre',
          curso: row.curso || '',
        });
      }
    }
    return [...map.values()];
  }, [monthRows]);

  const filteredParticipants = useMemo(() => {
    const nq = normalizeForSearch(participantSearch);
    if (!nq) return participants;
    return participants.filter((p) =>
      normalizeForSearch(`${p.nombre} ${p.documento} ${p.curso}`).includes(nq),
    );
  }, [participants, participantSearch]);

  const selectedParticipant = useMemo(
    () => filteredParticipants.find((p) => p.key === participantKey) || null,
    [filteredParticipants, participantKey],
  );

  const selectedBars = useMemo(() => {
    if (!selectedParticipant) return [];
    const rows = monthRows.filter(
      (r) => `${r.documento || ''}__${r.nombre || ''}` === selectedParticipant.key,
    );
    const totalAsistio = rows.filter((r) => normalizeReport(r.reporte) === normalizeReport('Asistió')).length;
    const totalFalto = rows.filter((r) => normalizeReport(r.reporte) === normalizeReport('Faltó')).length;
    const totalExcusa = rows.filter((r) => normalizeReport(r.reporte) === normalizeReport('Excusa')).length;
    return [
      { label: 'Asistió', total: totalAsistio, color: '#5FAD82' },
      { label: 'Faltó', total: totalFalto, color: '#DA0001' },
      { label: 'Excusa', total: totalExcusa, color: '#3d8dd4' },
    ];
  }, [selectedParticipant, monthRows]);

  const selectedMax = Math.max(1, ...selectedBars.map((b) => b.total));

  if (!navEnabled) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  return (
    <div className="att-main">
      <div className="att-history-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h2 className="h4 m-0" style={{ color: '#1b9bd7', fontWeight: 700 }}>
            Historial de Asistencia
          </h2>
          <div className="att-tabs">
            <button
              type="button"
              className={`att-tab-btn ${tab === 'tabla' ? 'is-active' : ''}`}
              onClick={() => setTab('tabla')}
            >
              Tabla
            </button>
            <button
              type="button"
              className={`att-tab-btn ${tab === 'graficos' ? 'is-active' : ''}`}
              onClick={() => setTab('graficos')}
            >
              Gráficos
            </button>
          </div>
        </div>

        {tab === 'tabla' ? (
          <>
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
          </>
        ) : (
          <div className="pt-2">
            <h3 className="h6 fw-bold mb-3">Inasistencias del mes actual por participante</h3>
            <div className="row g-3 align-items-end mb-3">
              <div className="col-md-5">
                <label className="form-label small fw-semibold mb-1">Buscar participante</label>
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Nombre, documento o curso"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                />
              </div>
              <div className="col-md-7">
                <label className="form-label small fw-semibold mb-1">Seleccionar participante</label>
                <select
                  className="form-select form-select-sm"
                  value={participantKey}
                  onChange={(e) => setParticipantKey(e.target.value)}
                >
                  <option value="">Selecciona un participante...</option>
                  {filteredParticipants.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.nombre} · {p.documento}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedParticipant ? (
              <p className="text-muted small mb-0">
                Selecciona un participante para ver su gráfica de inasistencias del mes.
              </p>
            ) : selectedBars.length === 0 ? (
              <div className="att-graph-board">
                <p className="small mb-1">
                  <strong>Curso:</strong> {selectedParticipant.curso || '—'}
                </p>
                <p className="text-muted small mb-0">
                  Este participante no registra inasistencias (`Faltó`) en el mes actual.
                </p>
              </div>
            ) : (
              <div className="att-graph-board d-grid gap-3">
                <p className="small mb-1">
                  <strong>Curso:</strong> {selectedParticipant.curso || '—'}
                </p>
                {selectedBars.map((item) => (
                  <div key={item.label} className="d-grid gap-1">
                    <div className="d-flex justify-content-between small">
                      <span>{item.label}</span>
                      <span className="fw-semibold">{item.total}</span>
                    </div>
                    <div className="att-bar-track">
                      <div
                        className="att-bar-fill"
                        style={{
                          width: `${Math.max(8, Math.round((item.total / selectedMax) * 100))}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
