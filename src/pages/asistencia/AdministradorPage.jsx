import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiUrl, getJson } from '../../lib/api.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';

function fmtFechaCorta(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toCsvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportInformesCsv(rows) {
  const headers = ['Estado PDF', 'Enviado', 'Fecha', 'Participante', 'Identificación', 'Categoría', 'Entrenador'];
  const lines = [headers.map(toCsvValue).join(',')];
  rows.forEach((r) => {
    const estadoPdf = r.informe ? 'Con PDF' : 'Sin PDF';
    const env = r.enviado ? 'Enviado' : 'No enviado';
    lines.push(
      [estadoPdf, env, fmtFechaCorta(r.fecha_creacion), r.participante, r.identificacion, r.nombreCategoria || r.categoria, r.entrenador]
        .map(toCsvValue)
        .join(','),
    );
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `informes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ESTADOS_FILTRO = [
  { value: 'todos', label: 'Todos' },
  { value: 'con_pdf', label: 'Con PDF' },
  { value: 'sin_pdf', label: 'Sin PDF' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'no_enviado', label: 'No enviado' },
];

function StatIcon({ type }) {
  if (type === 'total') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M4 19V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 19V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M22 19V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'pdf') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M5.5 3.5h9l4 4v13h-13z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14.5 3.5v4h4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 16h2.2a1.5 1.5 0 0 0 0-3H7.5v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 13h1.6a1.5 1.5 0 0 1 0 3H12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.2 17.5V13h2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.2 15.2h2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'missing') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M8 3h7l4 4v14H8z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 10v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="8" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (type === 'sent') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M12 7v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function AdministradorPage() {
  const { user } = useOutletContext() || {};
  const navEnabled = isNavKeyEnabled('administrador');
  const isAdmin = String(user?.rol || '').trim() === 'Administrador';

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaOpen, setCategoriaOpen] = useState(false);
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [entrenador, setEntrenador] = useState('');
  const [estado, setEstado] = useState('todos');

  const [applied, setApplied] = useState({
    fechaInicio: '',
    fechaFin: '',
    categoria: '',
    entrenador: '',
    estado: 'todos',
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [tableSearch, setTableSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tabla');

  const resumenQuery = useQuery({
    queryKey: ['admin-informes-resumen', applied],
    queryFn: () => {
      const u = new URLSearchParams();
      if (applied.fechaInicio) u.set('fechaInicio', applied.fechaInicio);
      if (applied.fechaFin) u.set('fechaFin', applied.fechaFin);
      if (applied.categoria) u.set('categoria', applied.categoria);
      if (applied.entrenador) u.set('entrenador', applied.entrenador);
      if (applied.estado && applied.estado !== 'todos') u.set('estado', applied.estado);
      return getJson(`/api/admin/informes/resumen?${u.toString()}`);
    },
    enabled: navEnabled && isAdmin,
    staleTime: 120_000,
  });

  const metaQuery = useQuery({
    queryKey: ['admin-informes-meta'],
    queryFn: async () => {
      const [cat, ent] = await Promise.all([
        getJson('/api/admin/informes/categorias'),
        getJson('/api/admin/informes/entrenadores'),
      ]);
      return { categorias: cat?.categorias || [], entrenadores: ent?.entrenadores || [] };
    },
    enabled: navEnabled && isAdmin,
    staleTime: 5 * 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['admin-informes-list', applied, page, limit],
    queryFn: () => {
      const u = new URLSearchParams();
      u.set('page', String(page));
      u.set('limit', String(limit));
      if (applied.fechaInicio) u.set('fechaInicio', applied.fechaInicio);
      if (applied.fechaFin) u.set('fechaFin', applied.fechaFin);
      if (applied.categoria) u.set('categoria', applied.categoria);
      if (applied.entrenador) u.set('entrenador', applied.entrenador);
      if (applied.estado && applied.estado !== 'todos') u.set('estado', applied.estado);
      return getJson(`/api/admin/informes?${u.toString()}`);
    },
    enabled: navEnabled && isAdmin,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  const chartQuery = useQuery({
    queryKey: ['admin-informes-chart', applied],
    queryFn: () => {
      const u = new URLSearchParams();
      if (applied.fechaInicio) u.set('fechaInicio', applied.fechaInicio);
      if (applied.fechaFin) u.set('fechaFin', applied.fechaFin);
      if (applied.categoria) u.set('categoria', applied.categoria);
      if (applied.entrenador) u.set('entrenador', applied.entrenador);
      if (applied.estado && applied.estado !== 'todos') u.set('estado', applied.estado);
      return getJson(`/api/admin/informes/grafico-categorias?${u.toString()}`);
    },
    enabled: navEnabled && isAdmin,
    staleTime: 60_000,
  });

  const rows = listQuery.data?.evaluaciones || [];
  const total = Number(listQuery.data?.total ?? 0);

  const filteredRows = useMemo(() => {
    const q = normalizeForSearch(tableSearch);
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = normalizeForSearch(
        `${r.participante} ${r.identificacion} ${r.categoria} ${r.nombreCategoria} ${r.entrenador}`,
      );
      return blob.includes(q);
    });
  }, [rows, tableSearch]);

  const aplicarFiltros = () => {
    setApplied({
      fechaInicio: fechaInicio.trim(),
      fechaFin: fechaFin.trim(),
      categoria: categoria.trim(),
      entrenador: entrenador.trim(),
      estado,
    });
    setCategoriaOpen(false);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setCategoria('');
    setCategoriaOpen(false);
    setCategoriaSearch('');
    setEntrenador('');
    setEstado('todos');
    setApplied({
      fechaInicio: '',
      fechaFin: '',
      categoria: '',
      entrenador: '',
      estado: 'todos',
    });
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!navEnabled) return <Navigate to={getDefaultAppPath()} replace />;
  if (!isAdmin) return <Navigate to={getDefaultAppPath()} replace />;

  const r = resumenQuery.data || {};
  const categorias = metaQuery.data?.categorias || [];
  const entrenadores = metaQuery.data?.entrenadores || [];
  const categoriaActual = categorias.find((c) => c.id === categoria) || null;
  const categoriasFiltradas = useMemo(() => {
    const q = normalizeForSearch(categoriaSearch);
    if (!q) return categorias;
    return categorias.filter((c) => normalizeForSearch(`${c.nombre} ${c.id}`).includes(q));
  }, [categorias, categoriaSearch]);

  return (
    <div className="att-main att-main--wide att-admin-page">
      <h2 className="h5 fw-bold mb-3 att-admin-page__title">Administrador — Informes</h2>

      <div className="att-admin-stats">
        <article className="att-admin-stat-card">
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="total" />
          </span>
          <span className="att-admin-stat-card__label">Total evaluaciones</span>
          <strong className="att-admin-stat-card__value">{resumenQuery.isLoading ? '…' : r.totalEvaluaciones ?? '—'}</strong>
        </article>
        <article className="att-admin-stat-card">
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="pdf" />
          </span>
          <span className="att-admin-stat-card__label">Con informe (PDF)</span>
          <strong className="att-admin-stat-card__value">{resumenQuery.isLoading ? '…' : r.conInforme ?? '—'}</strong>
        </article>
        <article className="att-admin-stat-card">
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="missing" />
          </span>
          <span className="att-admin-stat-card__label">Sin informe</span>
          <strong className="att-admin-stat-card__value">{resumenQuery.isLoading ? '…' : r.sinInforme ?? '—'}</strong>
        </article>
        <article className="att-admin-stat-card">
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="sent" />
          </span>
          <span className="att-admin-stat-card__label">Enviados</span>
          <strong className="att-admin-stat-card__value">{resumenQuery.isLoading ? '…' : r.enviados ?? '—'}</strong>
        </article>
        <article className="att-admin-stat-card att-admin-stat-card--accent">
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="missingMonth" />
          </span>
          <span className="att-admin-stat-card__label">Sin informe (mes actual)</span>
          <strong className="att-admin-stat-card__value">
            {resumenQuery.isLoading ? '…' : r.participantesSinInformeMesActual ?? '—'}
          </strong>
        </article>
      </div>

      <section className="att-admin-filters card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h3 className="h6 fw-bold mb-3">Filtros de búsqueda</h3>
          <div className="row g-2 g-md-3 align-items-end">
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small mb-1 att-admin-filter-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Fecha inicio
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small mb-1 att-admin-filter-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Fecha fin
              </label>
              <input type="date" className="form-control form-control-sm" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small mb-1 att-admin-filter-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M6 6h12M6 12h8M6 18h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Categoría
              </label>
              <div className={`att-admin-select ${categoriaOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="att-admin-select__trigger"
                  onClick={() => setCategoriaOpen((v) => !v)}
                >
                  {categoriaActual?.nombre || 'Todas las categorías'}
                </button>
                {categoriaOpen ? (
                  <div className="att-admin-select__menu">
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      placeholder="Buscar categoría..."
                      value={categoriaSearch}
                      onChange={(e) => setCategoriaSearch(e.target.value)}
                    />
                    <div className="att-admin-select__options">
                      <button
                        type="button"
                        className={`att-admin-select__option ${categoria === '' ? 'is-selected' : ''}`}
                        onClick={() => {
                          setCategoria('');
                          setCategoriaOpen(false);
                        }}
                      >
                        Todas las categorías
                      </button>
                      {categoriasFiltradas.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`att-admin-select__option ${categoria === c.id ? 'is-selected' : ''}`}
                          onClick={() => {
                            setCategoria(c.id);
                            setCategoriaOpen(false);
                          }}
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small mb-1 att-admin-filter-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M6 19c1.2-2.4 3.4-3.8 6-3.8s4.8 1.4 6 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Entrenador
              </label>
              <select className="form-select form-select-sm" value={entrenador} onChange={(e) => setEntrenador(e.target.value)}>
                <option value="">Todos los entrenadores</option>
                {entrenadores.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small mb-1 att-admin-filter-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="2" fill="currentColor" />
                  <circle cx="7" cy="17" r="2" fill="currentColor" />
                  <path d="M11 7h7M11 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Estado
              </label>
              <select className="form-select form-select-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
                {ESTADOS_FILTRO.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 d-flex justify-content-end gap-2 mt-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={aplicarFiltros}>
                Aplicar filtros
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpiarFiltros}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="att-admin-tabs mb-2">
        <button
          type="button"
          className={`att-admin-tab ${activeTab === 'tabla' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('tabla')}
        >
          Tabla
        </button>
        <button
          type="button"
          className={`att-admin-tab ${activeTab === 'graficos' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('graficos')}
        >
          Gráficos por categoría
        </button>
      </div>

      {activeTab === 'graficos' ? (
        <section className="att-admin-chart card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h3 className="h6 fw-bold mb-3">Enviados vs no enviados por categoría</h3>
            {chartQuery.isLoading ? (
              <p className="small text-muted mb-0">Cargando gráfico…</p>
            ) : chartQuery.isError ? (
              <p className="small text-danger mb-0">No se pudo cargar el gráfico.</p>
            ) : (chartQuery.data?.categorias || []).length === 0 ? (
              <p className="small text-muted mb-0">No hay datos con los filtros seleccionados.</p>
            ) : (
              <div className="att-admin-chart-list">
                {(chartQuery.data?.categorias || []).map((item) => {
                  const totalCat = Math.max(1, Number(item.total || 0));
                  const enviadosPct = Math.round((Number(item.enviados || 0) * 100) / totalCat);
                  const noEnviadosPct = 100 - enviadosPct;
                  return (
                    <article key={item.categoria} className="att-admin-chart-item">
                      <div className="att-admin-chart-item__head">
                        <strong>{item.categoria}</strong>
                        <span className="small text-muted">
                          {item.enviados} enviados · {item.noEnviados} no enviados
                        </span>
                      </div>
                      <div className="att-admin-chart-item__bar" aria-hidden="true">
                        <span className="att-admin-chart-item__bar--sent" style={{ width: `${enviadosPct}%` }} />
                        <span className="att-admin-chart-item__bar--unsent" style={{ width: `${noEnviadosPct}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === 'tabla' ? (
        <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 att-admin-table-toolbar">
        <div className="d-flex align-items-center gap-2">
          <label className="small mb-0">Mostrar</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '5.5rem' }}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="small text-muted">registros</span>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button type="button" className="btn btn-success btn-sm" onClick={() => exportInformesCsv(filteredRows)} disabled={!filteredRows.length}>
            Exportar Excel
          </button>
          <label className="small mb-0">Buscar:</label>
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ width: '12rem' }}
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Texto…"
          />
        </div>
      </div>

      <div className="table-responsive att-admin-table-wrap att-admin-table-wrap--mobile-safe">
        <table className="table table-sm table-hover att-admin-table mb-0">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Enviado</th>
              <th>Acciones</th>
              <th>Fecha</th>
              <th>Participante</th>
              <th>Identificación</th>
              <th>Categoría</th>
              <th>Entrenador</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="text-muted text-center py-4">
                  Cargando…
                </td>
              </tr>
            ) : listQuery.isError ? (
              <tr>
                <td colSpan={8} className="text-danger text-center py-4">
                  No se pudo cargar el listado.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted text-center py-4">
                  No hay registros.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Estado">
                    <span className={`badge ${row.informe ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {row.informe ? 'Con PDF' : 'Sin PDF'}
                    </span>
                  </td>
                  <td data-label="Enviado">
                    <span className={`badge ${row.enviado ? 'text-bg-info' : 'text-bg-light text-dark border'}`}>
                      {row.enviado ? 'Enviado' : 'No enviado'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm py-0 px-2"
                      title="Ver informe"
                      disabled={!row.informe}
                      onClick={() => row.informe && window.open(apiUrl(row.informe), '_blank', 'noopener,noreferrer')}
                    >
                      Ver
                    </button>
                  </td>
                  <td data-label="Fecha">{fmtFechaCorta(row.fecha_creacion)}</td>
                  <td data-label="Participante">{row.participante || '—'}</td>
                  <td data-label="Identificación">{row.identificacion || '—'}</td>
                  <td data-label="Categoría">{row.nombreCategoria || row.categoria || '—'}</td>
                  <td data-label="Entrenador" className="small text-break">{row.entrenador || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > limit ? (
        <div className="d-flex justify-content-between align-items-center mt-3 small att-admin-pagination">
          <span className="text-muted">
            Página {page} de {totalPages} ({total} registros)
          </span>
          <div className="btn-group btn-group-sm">
            <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
