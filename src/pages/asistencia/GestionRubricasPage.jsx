import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, postJson, apiFetch } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';

const TIPOS = ['Técnico', 'Físico', 'Táctico', 'Actitudinal', 'Psicológico', 'Cultural'];

function toRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rubricas)) return payload.rubricas;
  if (typeof payload === 'object') {
    return Object.values(payload).filter((v) => v && typeof v === 'object' && 'id' in v);
  }
  return [];
}

function cursoId(c) {
  return String(c?.ID_Curso ?? c?.id_curso ?? '').trim();
}

function cursoLabel(c) {
  return c?.Nombre_del_curso || c?.nombre_del_curso || c?.Nombre_Corto_Curso || c?.nombre_corto_curso || 'Sin nombre';
}

function exportRubricas(rows) {
  const headers = [
    'Nombre',
    'Tipo',
    'Categoría',
    'Común',
    'Estado',
    'Responsable',
    'Descripción',
    'Satisfactorio Alto',
    'Satisfactorio Básico',
    'En Proceso de Desarrollo',
  ];
  const toCsv = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const lines = [headers.map(toCsv).join(',')];
  rows.forEach((r) => {
    lines.push(
      [
        r.nombre,
        r.tipo,
        r.nombreCategoria,
        r.comun ? 'Sí' : 'No',
        r.estado,
        r.responsable,
        r.descripcion,
        r.alto,
        r.medio,
        r.bajo,
      ]
        .map(toCsv)
        .join(','),
    );
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rubricas_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CursoSearchSelect({
  cursos = [],
  value,
  onChange,
  placeholder = 'Seleccionar categoría...',
  allLabel = 'Todos',
  allowAll = true,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = cursos.find((c) => cursoId(c) === String(value || '')) || null;
  const q = normalizeForSearch(search);
  const filtered = q
    ? cursos.filter((c) => normalizeForSearch(cursoLabel(c)).includes(q))
    : cursos;

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
        {selected ? cursoLabel(selected) : allowAll ? allLabel : placeholder}
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
                {allLabel}
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

function RubricaModal({
  open,
  onClose,
  onSubmit,
  initialData,
  isPending,
  canUseComun,
  cursos = [],
}) {
  const isEditing = Boolean(initialData?.id);
  const [form, setForm] = useState(() => ({
    nombre: initialData?.nombre || '',
    tipo: initialData?.tipo || '',
    descripcion: initialData?.descripcion || '',
    categoria: String(initialData?.categoria || ''),
    alto: initialData?.alto || '',
    medio: initialData?.medio || '',
    bajo: initialData?.bajo || '',
    comun: Boolean(initialData?.comun),
    estado: initialData?.estado || 'ACTIVO',
  }));

  if (!open) return null;
  const selectedCurso = cursos.find((c) => cursoId(c) === form.categoria);

  const submit = (e) => {
    e.preventDefault();
    if (!selectedCurso) return;
    onSubmit({
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim(),
      descripcion: form.descripcion.trim(),
      categoria: cursoId(selectedCurso),
      nombreCategoria: cursoLabel(selectedCurso),
      alto: form.alto.trim(),
      medio: form.medio.trim(),
      bajo: form.bajo.trim(),
      actividad: String(selectedCurso?.Actividad ?? initialData?.actividad ?? '').trim(),
      comun: canUseComun ? (form.comun ? 1 : 0) : 0,
      estado: form.estado || 'ACTIVO',
    });
  };

  return (
    <div className="att-modal-backdrop" role="dialog" aria-modal="true">
      <div className="att-modal att-rubrica-modal">
        <div className="att-rubrica-modal__head">
          <h3 className="att-rubrica-modal__title">{initialData?.id ? 'Editar rúbrica' : 'Nueva rúbrica'}</h3>
          <button type="button" className="att-rubrica-modal__close" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>
        <form className="att-rubrica-form" onSubmit={submit}>
          <section className="att-rubrica-form__section">
            <h4 className="att-rubrica-form__section-title">Información general</h4>
            <div className="att-rubrica-form__grid">
              {isEditing ? (
                <label className="form-label fw-semibold mb-1">
                  Estado *
                  <select
                    className="form-select mt-1"
                    value={form.estado || 'ACTIVO'}
                    onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value }))}
                    required
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </label>
              ) : null}
              <label className="form-label fw-semibold mb-1">
                Nombre de la rúbrica *
                <input
                  className="form-control mt-1"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                  maxLength={180}
                />
              </label>
              <label className="form-label fw-semibold mb-1">
                Tipo *
                <select
                  className="form-select mt-1"
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-label fw-semibold mb-1 att-rubrica-form__full">
                Categoría *
                <div className="mt-1">
                  <CursoSearchSelect
                    cursos={cursos}
                    value={form.categoria}
                    onChange={(next) => setForm((prev) => ({ ...prev, categoria: next }))}
                    placeholder="Seleccionar categoría..."
                    allowAll={false}
                  />
                </div>
              </label>
            </div>
            <label className="form-label fw-semibold mb-1">
              Descripción
              <textarea
                className="form-control mt-1"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                maxLength={1000}
              />
            </label>
            <div className="att-rubrica-common-box">
              <label className="d-flex align-items-start gap-2 m-0">
                <input
                  type="checkbox"
                  checked={form.comun}
                  disabled={!canUseComun}
                  onChange={(e) => setForm((prev) => ({ ...prev, comun: e.target.checked }))}
                  className="form-check-input mt-1"
                />
                <span>Rúbrica común (aplica para todas las categorías de la actividad)</span>
              </label>
              {!canUseComun ? (
                <div className="small text-muted mt-1">Solo administradores y líderes pueden crear rúbricas comunes.</div>
              ) : null}
            </div>
          </section>

          <section className="att-rubrica-form__section">
            <h4 className="att-rubrica-form__section-title">Niveles de desempeño</h4>
            <div className="att-rubrica-levels">
              <label className="form-label fw-semibold mb-0">
                Satisfactorio Alto
                <textarea
                  className="form-control mt-1"
                  rows={5}
                  value={form.alto}
                  onChange={(e) => setForm((prev) => ({ ...prev, alto: e.target.value }))}
                  maxLength={1000}
                />
              </label>
              <label className="form-label fw-semibold mb-0">
                Satisfactorio Básico
                <textarea
                  className="form-control mt-1"
                  rows={5}
                  value={form.medio}
                  onChange={(e) => setForm((prev) => ({ ...prev, medio: e.target.value }))}
                  maxLength={1000}
                />
              </label>
              <label className="form-label fw-semibold mb-0">
                En Proceso de Desarrollo
                <textarea
                  className="form-control mt-1"
                  rows={5}
                  value={form.bajo}
                  onChange={(e) => setForm((prev) => ({ ...prev, bajo: e.target.value }))}
                  maxLength={1000}
                />
              </label>
            </div>
          </section>

          <div className="att-rubrica-form__actions d-flex justify-content-end gap-2 pt-1">
            <button type="button" className="btn btn-light btn-sm" onClick={onClose} disabled={isPending}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar rúbrica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RubricaViewModal({ open, rubrica, onClose, onEdit }) {
  if (!open || !rubrica) return null;
  return (
    <div className="att-modal-backdrop" role="dialog" aria-modal="true">
      <div className="att-modal att-rubrica-modal">
        <div className="att-rubrica-modal__head">
          <h3 className="att-rubrica-modal__title">Detalle de rúbrica</h3>
          <button type="button" className="att-rubrica-modal__close" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>
        <div className="att-rubrica-form">
          <p className="small mb-1"><strong>Nombre:</strong> {rubrica.nombre || '—'}</p>
          <p className="small mb-1"><strong>Tipo:</strong> {rubrica.tipo || '—'}</p>
          <p className="small mb-1"><strong>Categoría:</strong> {rubrica.nombreCategoria || rubrica.categoria || '—'}</p>
          <p className="small mb-1"><strong>Estado:</strong> {rubrica.estado || '—'}</p>
          <p className="small mb-1"><strong>Común:</strong> {rubrica.comun ? 'Sí' : 'No'}</p>
          <p className="small mb-1"><strong>Descripción:</strong> {rubrica.descripcion || '—'}</p>
          <hr />
          <p className="small mb-1"><strong>Satisfactorio Alto:</strong> {rubrica.alto || '—'}</p>
          <p className="small mb-1"><strong>Satisfactorio Básico:</strong> {rubrica.medio || '—'}</p>
          <p className="small mb-3"><strong>En Proceso de Desarrollo:</strong> {rubrica.bajo || '—'}</p>
          <div className="d-flex justify-content-end">
            <button type="button" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1" onClick={onEdit}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25z" />
              </svg>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GestionRubricasPage() {
  const { user } = useOutletContext() || {};
  const email = user?.email || '';
  const rol = user?.rol || '';
  const isAdmin = rol === 'Administrador';
  const navEnabled = isNavKeyEnabled('rubricas');

  const [search, setSearch] = useState('');
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmEstado, setConfirmEstado] = useState(null);
  const [toastState, setToastState] = useState({ show: false, type: 'success', message: '' });

  const cursosQuery = useQuery({
    queryKey: ['rubricas-cursos', email, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const full = await getJson('/api/rubricas?scope=all');
        const map = new Map();
        toRows(full).forEach((r) => {
          const id = String(r.categoria || '').trim();
          if (!id || map.has(id)) return;
          map.set(id, {
            ID_Curso: id,
            Nombre_del_curso: r.nombreCategoria || `Curso ${id}`,
            Actividad: r.actividad || '',
          });
        });
        return { cursos: [...map.values()] };
      }
      return getJson(`/api/cursos?correo=${encodeURIComponent(email)}&soloMisCursos=true`);
    },
    enabled: Boolean(email),
  });

  const rubricasQuery = useQuery({
    queryKey: ['rubricas', { selectedCursoId, isAdmin }],
    queryFn: async () => {
      if (isAdmin && !selectedCursoId) return getJson('/api/rubricas?scope=all');
      if (selectedCursoId) return getJson(`/api/rubricas?cursoId=${encodeURIComponent(selectedCursoId)}`);
      return getJson('/api/rubricas');
    },
    enabled: Boolean(email),
  });

  const canUseComun = useMemo(() => {
    if (isAdmin) return true;
    const rows = toRows(rubricasQuery.data);
    return rows.some((r) => String(r.responsable || '').toLowerCase() === email.toLowerCase() && r.comun);
  }, [isAdmin, rubricasQuery.data, email]);

  const saveMutation = useMutation({
    mutationFn: (body) => {
      if (editing?.id) {
        return apiFetch(`/api/rubricas/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      return postJson('/api/rubricas', body);
    },
    onSuccess: () => {
      const action = editing?.id ? 'actualizada' : 'creada';
      setToastState({ show: true, type: 'success', message: `Rúbrica ${action} correctamente.` });
      window.setTimeout(() => {
        setToastState((prev) => ({ ...prev, show: false }));
      }, 2200);
      setModalOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      queryClient.invalidateQueries({ queryKey: ['rubricas-cursos'] });
      queryClient.invalidateQueries({ queryKey: ['reportes-rubricas'] });
    },
    onError: (error) => {
      setToastState({ show: true, type: 'danger', message: error?.message || 'No se pudo guardar la rúbrica.' });
      window.setTimeout(() => {
        setToastState((prev) => ({ ...prev, show: false }));
      }, 2600);
    },
  });

  const toggleEstadoMutation = useMutation({
    mutationFn: ({ rubrica, estado }) =>
      apiFetch(`/api/rubricas/${rubrica.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: rubrica.nombre,
          tipo: rubrica.tipo,
          descripcion: rubrica.descripcion,
          categoria: rubrica.categoria,
          nombreCategoria: rubrica.nombreCategoria,
          alto: rubrica.alto,
          medio: rubrica.medio,
          bajo: rubrica.bajo,
          actividad: rubrica.actividad,
          comun: rubrica.comun ? 1 : 0,
          estado,
        }),
      }),
    onSuccess: (_, vars) => {
      toastOkEstado(vars.estado);
      setConfirmEstado(null);
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      queryClient.invalidateQueries({ queryKey: ['reportes-rubricas'] });
    },
    onError: (error) => {
      setToastState({ show: true, type: 'danger', message: error?.message || 'No se pudo cambiar el estado.' });
      window.setTimeout(() => setToastState((prev) => ({ ...prev, show: false })), 2600);
    },
  });

  const toastOkEstado = (estado) => {
    const txt = estado === 'ACTIVO' ? 'Rúbrica activada correctamente.' : 'Rúbrica inactivada correctamente.';
    setToastState({ show: true, type: 'success', message: txt });
    window.setTimeout(() => setToastState((prev) => ({ ...prev, show: false })), 2200);
  };

  const cursos = useMemo(() => cursosQuery.data?.cursos || [], [cursosQuery.data]);
  const rubricas = useMemo(() => toRows(rubricasQuery.data), [rubricasQuery.data]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    return rubricas.filter((r) => {
      if (selectedCursoId && String(r.categoria || '') !== selectedCursoId) {
        const curso = cursos.find((c) => cursoId(c) === selectedCursoId);
        if (!curso || !r.comun || String(r.actividad || '') !== String(curso?.Actividad || '')) return false;
      }
      if (selectedTipo && normalizeForSearch(r.tipo) !== normalizeForSearch(selectedTipo)) return false;
      if (selectedEstado && normalizeForSearch(r.estado) !== normalizeForSearch(selectedEstado)) return false;
      if (!q) return true;
      const blob = normalizeForSearch(`${r.nombre} ${r.tipo} ${r.descripcion} ${r.nombreCategoria} ${r.estado}`);
      return blob.includes(q);
    });
  }, [rubricas, search, selectedCursoId, selectedTipo, selectedEstado, cursos]);

  const tipoOptions = useMemo(() => {
    const set = new Set();
    rubricas.forEach((r) => {
      if (r?.tipo) set.add(String(r.tipo));
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [rubricas]);

  const estadoOptions = useMemo(() => {
    const set = new Set();
    rubricas.forEach((r) => {
      if (r?.estado) set.add(String(r.estado));
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [rubricas]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0)),
    [filtered],
  );
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * pageSize;
  const paged = sortedFiltered.slice(from, from + pageSize);

  if (!navEnabled) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  return (
    <div className="att-main">
      <div className="att-history-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <h2 className="h4 m-0 fw-bold" style={{ color: '#3d8dd4' }}>
            Rúbricas
          </h2>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Nueva Rúbrica
          </button>
        </div>
        <hr className="mt-2 mb-3" />

        <div className="att-rubrica-filters mb-3">
          <div>
            <label className="form-label small fw-semibold mb-1">Buscar:</label>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Nombre, tipo o descripción..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="form-label small fw-semibold mb-1">Curso:</label>
            <CursoSearchSelect
              cursos={cursos}
              value={selectedCursoId}
              onChange={(next) => {
                setSelectedCursoId(next);
                setPage(1);
              }}
              allLabel="Todos"
              allowAll
            />
          </div>
          <div>
            <label className="form-label small fw-semibold mb-1">Tipo:</label>
            <select
              className="form-select form-select-sm"
              value={selectedTipo}
              onChange={(e) => {
                setSelectedTipo(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {tipoOptions.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small fw-semibold mb-1">Estado:</label>
            <select
              className="form-select form-select-sm"
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {estadoOptions.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div className="d-flex align-items-center gap-2 small text-muted">
            <span>Mostrar</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 90 }}
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
            <span>registros</span>
          </div>
          <button type="button" className="btn btn-success btn-sm" onClick={() => exportRubricas(filtered)}>
            Exportar a Excel
          </button>
        </div>

        {rubricasQuery.isPending || cursosQuery.isPending ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : rubricasQuery.isError || cursosQuery.isError ? (
          <div className="alert alert-danger small">
            {rubricasQuery.error?.message || cursosQuery.error?.message || 'No se pudo cargar la información.'}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm align-middle att-history-table att-rubricas-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Común</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewing(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setViewing(r);
                      }}
                    >
                      <td data-label="Nombre">{r.nombre || '—'}</td>
                      <td data-label="Tipo">{r.tipo || '—'}</td>
                      <td data-label="Categoría">{r.nombreCategoria || r.categoria || '—'}</td>
                      <td data-label="Común">
                        <span className={`badge ${r.comun ? 'text-bg-secondary' : 'text-bg-light'}`}>
                          {r.comun ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td data-label="Estado">
                        <button
                          type="button"
                          className={`att-state-btn ${
                            String(r.estado || 'ACTIVO').toUpperCase() === 'ACTIVO' ? 'is-active' : 'is-inactive'
                          }`}
                          disabled={toggleEstadoMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            const current = String(r.estado || 'ACTIVO').toUpperCase();
                            if (current === 'ACTIVO') {
                              setConfirmEstado(r);
                              return;
                            }
                            toggleEstadoMutation.mutate({ rubrica: r, estado: 'ACTIVO' });
                          }}
                        >
                          {String(r.estado || 'ACTIVO').toUpperCase()}
                        </button>
                      </td>
                      <td data-label="Acciones">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(r);
                            setModalOpen(true);
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        No hay rúbricas para mostrar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center small text-muted">
              <span>
                Mostrando {sortedFiltered.length === 0 ? 0 : from + 1} a{' '}
                {Math.min(from + pageSize, sortedFiltered.length)} de {sortedFiltered.length} registros
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

      <RubricaModal
        key={editing?.id ? `edit-${editing.id}` : modalOpen ? 'new-open' : 'new-closed'}
        open={modalOpen}
        onClose={() => {
          if (saveMutation.isPending) return;
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={(body) => saveMutation.mutate(body)}
        initialData={editing}
        isPending={saveMutation.isPending}
        canUseComun={canUseComun}
        cursos={cursos}
      />
      <RubricaViewModal
        open={Boolean(viewing)}
        rubrica={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
          setModalOpen(true);
        }}
      />
      {confirmEstado ? (
        <div className="att-modal-backdrop" role="dialog" aria-modal="true">
          <div className="att-modal att-modal--excusa">
            <div className="att-modal__head">
              <h3 className="att-modal__title">Confirmar inactivación</h3>
              <button
                type="button"
                className="att-modal__close"
                onClick={() => !toggleEstadoMutation.isPending && setConfirmEstado(null)}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>
            <div className="att-modal__body d-grid gap-3">
              <p className="mb-0">
                ¿Está seguro de querer inactivar la rúbrica <strong>{confirmEstado.nombre || ''}</strong>?
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  disabled={toggleEstadoMutation.isPending}
                  onClick={() => setConfirmEstado(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={toggleEstadoMutation.isPending}
                  onClick={() => toggleEstadoMutation.mutate({ rubrica: confirmEstado, estado: 'INACTIVO' })}
                >
                  {toggleEstadoMutation.isPending ? 'Guardando...' : 'Sí, inactivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {toastState.show ? (
        <div className={`att-toast att-toast--${toastState.type === 'danger' ? 'error' : 'success'}`} role="status">
          <div className="att-toast__icon" aria-hidden="true">
            {toastState.type === 'danger' ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                <path d="M7.5 12.2l3 3.1 6-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
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
