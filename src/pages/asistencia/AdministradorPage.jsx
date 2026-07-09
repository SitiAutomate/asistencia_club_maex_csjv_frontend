import { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJson, openAuthenticatedUpload } from '../../lib/api.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';
import {
  periodoActualDesdeConfig,
  periodoEtiqueta,
  usePeriodoInformesConfig,
} from '../../lib/periodoInformes.js';

function tieneInformePdf(informe) {
  return Boolean(String(informe ?? '').trim());
}

function fmtFechaCorta(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function exportInformesExcel(rows) {
  const { exportRowsToExcel } = await import('../../lib/exportExcel.js');
  await exportRowsToExcel({
    rows,
    sheetName: 'Informes',
    fileNamePrefix: 'informes',
    columns: [
      {
        key: 'informe',
        header: 'Estado PDF',
        format: (value) => (tieneInformePdf(value) ? 'Con PDF' : 'Sin PDF'),
      },
      {
        key: 'enviado',
        header: 'Enviado',
        format: (value) => (value ? 'Enviado' : 'No enviado'),
      },
      {
        key: 'fecha_creacion',
        header: 'Fecha',
        format: (value) => fmtFechaCorta(value),
      },
      { key: 'participante', header: 'Participante' },
      { key: 'identificacion', header: 'Identificación' },
      {
        key: 'nombreCategoria',
        header: 'Categoría',
        format: (_value, row) => row.nombreCategoria || row.categoria || '',
      },
      { key: 'entrenador', header: 'Entrenador' },
    ],
  });
}

function buildInformesFilterParams(filters) {
  const u = new URLSearchParams();
  if (filters.fechaInicio) u.set('fechaInicio', filters.fechaInicio);
  if (filters.fechaFin) u.set('fechaFin', filters.fechaFin);
  if (filters.anio) u.set('anio', filters.anio);
  if (filters.periodo) u.set('periodo', filters.periodo);
  if (filters.categoria) u.set('categoria', filters.categoria);
  if (filters.linea) u.set('linea', filters.linea);
  if (filters.entrenador) u.set('entrenador', filters.entrenador);
  if (filters.estado && filters.estado !== 'todos') u.set('estado', filters.estado);
  return u;
}

function buildInformesListParams(filters, page, limit) {
  const u = buildInformesFilterParams(filters);
  u.set('page', String(page));
  u.set('limit', String(limit));
  return u;
}

function filterRowsBySearch(rows, search) {
  const q = normalizeForSearch(search);
  if (!q) return rows;
  return rows.filter((r) => {
    const blob = normalizeForSearch(
      `${r.participante} ${r.identificacion} ${r.categoria} ${r.nombreCategoria} ${r.entrenador}`,
    );
    return blob.includes(q);
  });
}

const ESTADOS_FILTRO = [
  { value: 'todos', label: 'Todos' },
  { value: 'con_pdf', label: 'Con PDF' },
  { value: 'sin_pdf', label: 'Sin PDF' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'no_enviado', label: 'No enviado' },
];

function getPeriodoActualFallback() {
  const mes = new Date().getMonth() + 1;
  return mes >= 11 ? 'ago_dic' : 'ene_jul';
}

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
  const periodoConfigQuery = usePeriodoInformesConfig(navEnabled && isAdmin);
  const periodoConfig = periodoConfigQuery.data;
  const periodoSugerido = periodoConfigQuery.isSuccess
    ? periodoActualDesdeConfig(periodoConfig)
    : getPeriodoActualFallback();
  const currentYearNum = new Date().getFullYear();
  const currentYear = String(Math.max(2025, currentYearNum));
  const firstYear = Math.max(2025, Number(currentYear) - 2);
  const aniosDisponibles = Array.from(
    { length: Number(currentYear) - firstYear + 1 },
    (_, idx) => String(firstYear + idx),
  );
  const yearActual = currentYear;
  const periodoActual = periodoSugerido;

  const [periodo, setPeriodo] = useState(() => getPeriodoActualFallback());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [anio, setAnio] = useState(yearActual);
  const [categoria, setCategoria] = useState('');
  const [linea, setLinea] = useState('');
  const [categoriaOpen, setCategoriaOpen] = useState(false);
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [entrenador, setEntrenador] = useState('');
  const [estado, setEstado] = useState('todos');

  const [applied, setApplied] = useState({
    periodo: getPeriodoActualFallback(),
    fechaInicio: '',
    fechaFin: '',
    anio: yearActual,
    categoria: '',
    linea: '',
    entrenador: '',
    estado: 'todos',
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [tableSearch, setTableSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tabla');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!periodoConfigQuery.isSuccess) return;
    const actual = periodoActualDesdeConfig(periodoConfig);
    setPeriodo(actual);
    setApplied((prev) => ({ ...prev, periodo: actual }));
  }, [periodoConfigQuery.isSuccess, periodoConfig]);

  const resumenQuery = useQuery({
    queryKey: ['admin-informes-resumen', applied],
    queryFn: () => {
      const u = new URLSearchParams();
      if (applied.fechaInicio) u.set('fechaInicio', applied.fechaInicio);
      if (applied.fechaFin) u.set('fechaFin', applied.fechaFin);
      if (applied.anio) u.set('anio', applied.anio);
      if (applied.periodo) u.set('periodo', applied.periodo);
      if (applied.categoria) u.set('categoria', applied.categoria);
      if (applied.linea) u.set('linea', applied.linea);
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
      const u = buildInformesListParams(applied, page, limit);
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
      if (applied.anio) u.set('anio', applied.anio);
      if (applied.periodo) u.set('periodo', applied.periodo);
      if (applied.categoria) u.set('categoria', applied.categoria);
      if (applied.linea) u.set('linea', applied.linea);
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
    return filterRowsBySearch(rows, tableSearch);
  }, [rows, tableSearch]);

  const exportarTodos = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const u = buildInformesFilterParams(applied);
      const data = await getJson(`/api/admin/informes/export?${u.toString()}`);
      const rowsToExport = filterRowsBySearch(data?.evaluaciones || [], tableSearch);
      if (!rowsToExport.length) return;
      await exportInformesExcel(rowsToExport);
    } catch {
      window.alert('No se pudo exportar el listado completo. Intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const aplicarFiltros = () => {
    setApplied({
      periodo: periodo || periodoActual,
      fechaInicio: fechaInicio.trim(),
      fechaFin: fechaFin.trim(),
      anio: String(anio || '').trim(),
      categoria: categoria.trim(),
      linea: linea.trim(),
      entrenador: entrenador.trim(),
      estado,
    });
    setCategoriaOpen(false);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setPeriodo(periodoSugerido);
    setFechaInicio('');
    setFechaFin('');
    setAnio(yearActual);
    setCategoria('');
    setLinea('');
    setCategoriaOpen(false);
    setCategoriaSearch('');
    setEntrenador('');
    setEstado('todos');
    setApplied({
      periodo: periodoSugerido,
      fechaInicio: '',
      fechaFin: '',
      anio: yearActual,
      categoria: '',
      linea: '',
      entrenador: '',
      estado: 'todos',
    });
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!navEnabled) return <Navigate to={getDefaultAppPath()} replace />;
  if (!isAdmin) return <Navigate to={getDefaultAppPath()} replace />;

  const r = resumenQuery.data || {};
  const statsLoading = resumenQuery.isLoading || resumenQuery.isFetching;
  const categorias = metaQuery.data?.categorias || [];
  const lineas = useMemo(() => {
    const set = new Set();
    categorias.forEach((c) => {
      const nombre = String(c?.nombreLinea || '').trim();
      if (nombre) set.add(nombre);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [categorias]);
  const entrenadores = metaQuery.data?.entrenadores || [];
  const categoriaActual = categorias.find((c) => c.id === categoria) || null;
  const categoriasFiltradas = useMemo(() => {
    const q = normalizeForSearch(categoriaSearch);
    const porLinea = !linea
      ? categorias
      : categorias.filter((c) => String(c?.nombreLinea || '').trim() === linea);
    if (!q) return porLinea;
    return porLinea.filter((c) => normalizeForSearch(`${c.nombre} ${c.id}`).includes(q));
  }, [categorias, categoriaSearch, linea]);

  return (
    <div className="att-main att-main--wide att-admin-page">
      <h2 className="h5 fw-bold mb-3 att-admin-page__title">Administrador — Informes</h2>

      <div className="att-admin-stats">
        <article className={`att-admin-stat-card ${statsLoading ? 'is-loading' : ''}`}>
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="total" />
          </span>
          <span className="att-admin-stat-card__label">Total inscritos (periodo)</span>
          <strong className="att-admin-stat-card__value">{statsLoading ? '…' : r.totalEvaluaciones ?? '—'}</strong>
        </article>
        <article className={`att-admin-stat-card ${statsLoading ? 'is-loading' : ''}`}>
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="pdf" />
          </span>
          <span className="att-admin-stat-card__label">Con informe (PDF)</span>
          <strong className="att-admin-stat-card__value">{statsLoading ? '…' : r.conInforme ?? '—'}</strong>
        </article>
        <article className={`att-admin-stat-card ${statsLoading ? 'is-loading' : ''}`}>
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="sent" />
          </span>
          <span className="att-admin-stat-card__label">Enviados</span>
          <strong className="att-admin-stat-card__value">{statsLoading ? '…' : r.enviados ?? '—'}</strong>
        </article>
        <article className={`att-admin-stat-card att-admin-stat-card--accent ${statsLoading ? 'is-loading' : ''}`}>
          <span className="att-admin-stat-card__icon" aria-hidden="true">
            <StatIcon type="missingMonth" />
          </span>
          <span className="att-admin-stat-card__label">Sin informe (periodo)</span>
          <strong className="att-admin-stat-card__value">
            {statsLoading ? '…' : r.participantesSinInformePeriodo ?? '—'}
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
                  <path d="M5 7h14M7 4v6M17 4v6M5 10h14v10H5z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Periodo
              </label>
              <select className="form-select form-select-sm" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                <option value="ene_jul">{periodoEtiqueta(periodoConfig, 'ene_jul')}</option>
                <option value="ago_dic">{periodoEtiqueta(periodoConfig, 'ago_dic')}</option>
              </select>
            </div>
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
                  <path d="M5 7h14M7 4v6M17 4v6M5 10h14v10H5z" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                Año
              </label>
              <select className="form-select form-select-sm" value={anio} onChange={(e) => setAnio(e.target.value)}>
                {aniosDisponibles.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
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
                  <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Línea
              </label>
              <select
                className="form-select form-select-sm"
                value={linea}
                onChange={(e) => {
                  setLinea(e.target.value);
                  setCategoria('');
                }}
              >
                <option value="">Todas las líneas</option>
                {lineas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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
          <button type="button" className="btn btn-success btn-sm" onClick={exportarTodos} disabled={isExporting || !total}>
            {isExporting ? 'Exportando…' : 'Exportar Excel'}
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
              filteredRows.map((row) => {
                const puedeVerPdf = tieneInformePdf(row.informe);
                return (
                <tr key={row.rowKey || row.id}>
                  <td data-label="Estado">
                    <span className={`badge ${puedeVerPdf ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {puedeVerPdf ? 'Con PDF' : 'Sin PDF'}
                    </span>
                  </td>
                  <td data-label="Enviado">
                    <span className={`badge ${row.enviado ? 'text-bg-info' : 'text-bg-light text-dark border'}`}>
                      {row.enviado ? 'Enviado' : 'No enviado'}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    {puedeVerPdf ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm py-0 px-2"
                        title="Ver informe"
                        onClick={() => {
                          openAuthenticatedUpload(row.informe).catch((err) => {
                            window.alert(err?.message || 'No se pudo abrir el informe');
                          });
                        }}
                      >
                        Ver
                      </button>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  <td data-label="Fecha">{fmtFechaCorta(row.fecha_creacion)}</td>
                  <td data-label="Participante">{row.participante || '—'}</td>
                  <td data-label="Identificación">{row.identificacion || '—'}</td>
                  <td data-label="Categoría">{row.nombreCategoria || row.categoria || '—'}</td>
                  <td data-label="Entrenador" className="small text-break">{row.entrenador || '—'}</td>
                </tr>
                );
              })
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
