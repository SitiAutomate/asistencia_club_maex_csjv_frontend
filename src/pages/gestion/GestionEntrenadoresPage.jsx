import { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isAdminLike, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { canGestion, useGestionPermisos } from '../../lib/useGestionPermisos.js';
import { IconPencil } from '../../components/gestion/GestionIcons.jsx';
import { SearchableSelect } from '../../components/gestion/SearchableSelect.jsx';
import { GestionNav } from '../../components/gestion/GestionNav.jsx';
import { GestionFab } from '../../components/gestion/GestionFab.jsx';
import { DrawerField, DrawerSection } from '../../components/gestion/SlideDrawer.jsx';
import { GestionPanel, GestionPanelModeToggle } from '../../components/gestion/GestionPanel.jsx';
import { AttToast, useAttToast } from '../../components/AttToast.jsx';

function emptyAsignacionRow() {
  return { actividad: '', estado: 'ACTIVO', apoyo: false, lider: false };
}

function AsignacionesEditor({ value, onChange, actividadOptions, disabled }) {
  const rows = value?.length ? value : [emptyAsignacionRow()];

  const updateRow = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const removeRow = (idx) => {
    const next = rows.filter((_, i) => i !== idx);
    onChange(next.length ? next : [emptyAsignacionRow()]);
  };

  return (
    <div className="d-flex flex-column gap-2">
      {rows.map((row, idx) => (
        <div key={`asig-${idx}`} className="border rounded p-2 bg-body-tertiary">
          <div className="row g-2 align-items-end">
            <div className="col-12">
              <label className="form-label small mb-1">Disciplina (actividad)</label>
              <SearchableSelect
                value={row.actividad ? String(row.actividad) : ''}
                onChange={(v) => updateRow(idx, { actividad: v })}
                options={actividadOptions}
                placeholder="Seleccione disciplina…"
                allowClear
                disabled={disabled}
              />
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label small mb-1">Estado</label>
              <select
                className="form-select form-select-sm"
                value={row.estado || 'ACTIVO'}
                disabled={disabled}
                onChange={(e) => updateRow(idx, { estado: e.target.value })}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
            <div className="col-6 col-md-4 d-flex flex-column gap-1 pb-1">
              <div className="form-check mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`apoyo-${idx}`}
                  checked={Boolean(row.apoyo)}
                  disabled={disabled}
                  onChange={(e) => updateRow(idx, { apoyo: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor={`apoyo-${idx}`}>
                  Apoyo en salidas
                </label>
              </div>
              <div className="form-check mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`lider-${idx}`}
                  checked={Boolean(row.lider)}
                  disabled={disabled}
                  onChange={(e) => updateRow(idx, { lider: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor={`lider-${idx}`}>
                  Líder
                </label>
              </div>
            </div>
            <div className="col-12 col-md-4 d-flex justify-content-md-end">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={disabled || rows.length <= 1}
                onClick={() => removeRow(idx)}
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm align-self-start"
        disabled={disabled}
        onClick={() => onChange([...rows, emptyAsignacionRow()])}
      >
        + Agregar disciplina
      </button>
      <div className="form-text">
        «Apoyo en salidas» otorga visibilidad global de cursos (mismo criterio operativo del sistema).
      </div>
    </div>
  );
}

function EntrenadorFormPanel({
  open,
  title,
  initial,
  actividadOptions,
  onClose,
  onSubmit,
  isPending,
  error,
  idLocked,
}) {
  const [form, setForm] = useState(() => initial || {});

  useEffect(() => {
    if (open) setForm(initial || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <GestionPanel
      open={open}
      onClose={onClose}
      eyebrow="Entrenador"
      title={title}
      width={560}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isPending}
            onClick={() => onSubmit(form)}
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {error ? <div className="alert alert-danger small py-2">{error}</div> : null}
      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <label className="form-label small">ID</label>
          <input
            className="form-control form-control-sm"
            value={form.id || ''}
            disabled={idLocked || isPending}
            onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
          />
        </div>
        <div className="col-md-8">
          <label className="form-label small">Nombre</label>
          <input
            className="form-control form-control-sm"
            value={form.nombre || ''}
            disabled={isPending}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
          />
        </div>
        <div className="col-12">
          <label className="form-label small">Correo</label>
          <input
            type="email"
            className="form-control form-control-sm"
            value={form.correo || ''}
            disabled={isPending}
            onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
          />
          <div className="form-text">Las asignaciones se vinculan por este correo.</div>
        </div>
      </div>
      <DrawerSection title="Disciplinas y apoyo">
        <AsignacionesEditor
          value={form.asignaciones || []}
          onChange={(asignaciones) => setForm((p) => ({ ...p, asignaciones }))}
          actividadOptions={actividadOptions}
          disabled={isPending}
        />
      </DrawerSection>
    </GestionPanel>
  );
}

export function GestionEntrenadoresPage() {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const canCreate = canGestion(permisosQuery.data, 'entrenadores', 'crear');
  const canEdit = canGestion(permisosQuery.data, 'entrenadores', 'editar');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { toast, showToast, setToast } = useAttToast();

  const query = useQuery({
    queryKey: ['gestion-entrenadores', q, page],
    queryFn: () =>
      getJson(`/api/gestion/entrenadores?page=${page}&limit=40&q=${encodeURIComponent(q)}`),
    enabled: isAdminLike(user),
  });

  const detailQuery = useQuery({
    queryKey: ['gestion-ficha', 'entrenador', selectedId],
    queryFn: () => getJson(`/api/gestion/entrenadores/${encodeURIComponent(selectedId)}`),
    enabled: Boolean(selectedId),
  });

  const editDetailQuery = useQuery({
    queryKey: ['gestion-ficha', 'entrenador', editing?.id],
    queryFn: () => getJson(`/api/gestion/entrenadores/${encodeURIComponent(editing.id)}`),
    enabled: Boolean(editing?.id) && !creating,
  });

  const actQuery = useQuery({
    queryKey: ['gestion-catalog-actividades'],
    queryFn: () => getJson('/api/gestion/catalogos/actividades'),
    staleTime: 5 * 60_000,
    enabled: isAdminLike(user),
  });

  const actividadOptions = useMemo(
    () =>
      (actQuery.data?.actividades || []).map((a) => ({
        value: String(a.id),
        label: a.nombre || String(a.id),
      })),
    [actQuery.data],
  );

  const saveMut = useMutation({
    mutationFn: (form) => {
      const asignaciones = (form.asignaciones || [])
        .filter((a) => a.actividad)
        .map((a) => ({
          actividad: Number(a.actividad),
          estado: a.estado || 'ACTIVO',
          apoyo: Boolean(a.apoyo),
          lider: Boolean(a.lider),
        }));
      const payload = {
        nombre: form.nombre,
        correo: form.correo,
        asignaciones,
      };
      if (editing?.id) {
        return patchJson(`/api/gestion/entrenadores/${encodeURIComponent(editing.id)}`, payload);
      }
      return postJson('/api/gestion/entrenadores', { ...payload, id: form.id });
    },
    onSuccess: async (_data, form) => {
      const wasEdit = Boolean(editing?.id);
      const id = wasEdit ? editing.id : form?.id;
      setEditing(null);
      setCreating(false);
      setQ('');
      setPage(1);
      if (id) setSelectedId(String(id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gestion-entrenadores'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-ficha', 'entrenador'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-catalog-entrenadores'] }),
      ]);
      showToast('success', wasEdit ? 'Entrenador actualizado' : 'Entrenador creado');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar el entrenador'),
  });

  const editInitial = useMemo(() => {
    if (creating) {
      return { id: '', nombre: '', correo: '', asignaciones: [emptyAsignacionRow()] };
    }
    if (!editing) return null;
    const fromDetail = editDetailQuery.data;
    const asig =
      fromDetail?.asignaciones?.map((a) => ({
        actividad: a.actividad != null ? String(a.actividad) : '',
        estado: a.estado || 'ACTIVO',
        apoyo: Boolean(a.apoyo),
        lider: Boolean(a.lider),
      })) || [emptyAsignacionRow()];
    return {
      id: editing.id || fromDetail?.entrenador?.id || '',
      nombre: fromDetail?.entrenador?.nombre || editing.nombre || '',
      correo: fromDetail?.entrenador?.correo || editing.correo || '',
      asignaciones: asig.length ? asig : [emptyAsignacionRow()],
    };
  }, [creating, editing, editDetailQuery.data]);

  const formReady = creating || (Boolean(editing) && (editDetailQuery.isSuccess || editDetailQuery.isError));

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const rows = query.data?.entrenadores || [];
  const meta = query.data?.meta || { page: 1, totalPages: 1, total: 0 };
  const detail = detailQuery.data?.entrenador;
  const detailAsig = detailQuery.data?.asignaciones || [];
  const detailCursos = detailQuery.data?.cursos || [];
  const selectedRow = rows.find((r) => String(r.id) === String(selectedId));

  return (
    <div className="att-main att-main--wide att-admin-page att-gestion-page">
      <div className="att-gestion-page__toolbar">
        <div className="att-gestion-page__actions">
          <GestionPanelModeToggle />
          <GestionNav />
        </div>
      </div>
      <div className="mb-3">
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: '100%', width: '100%' }}
          placeholder="Buscar por ID, nombre o correo…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {query.isError ? <div className="alert alert-danger small">{query.error?.message}</div> : null}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive att-admin-table-wrap--mobile-safe">
          <table className="table table-sm table-hover mb-0 att-admin-table att-gestion-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Disciplinas</th>
                <th>Cursos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.isPending ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </td>
                </tr>
              ) : null}
              {!query.isPending && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Sin entrenadores
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`att-split-row ${selectedId === r.id ? 'is-selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td data-label="ID">{r.id}</td>
                  <td data-label="Nombre">{r.nombre || '—'}</td>
                  <td data-label="Correo">{r.correo || '—'}</td>
                  <td data-label="Disciplinas">{r.countAsignaciones ?? 0}</td>
                  <td data-label="Cursos">{r.countCursos ?? 0}</td>
                  <td data-label="" onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm"
                        title="Editar"
                        onClick={() => {
                          setSelectedId(null);
                          setCreating(false);
                          setEditing(r);
                        }}
                      >
                        <IconPencil />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 small">
          <span className="text-center text-sm-start">{meta.total} registros</span>
          <div className="d-flex gap-2 justify-content-center justify-content-sm-end align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="text-nowrap">
              Pág. {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <GestionPanel
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        eyebrow="Entrenador"
        title={detail?.nombre || selectedRow?.nombre || 'Detalle'}
        subtitle={detail?.id || selectedId}
        width={560}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedId(null)}>
              Cerrar
            </button>
            {canEdit && (detail || selectedRow) ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditing(detail || selectedRow);
                  setSelectedId(null);
                }}
              >
                Editar
              </button>
            ) : null}
          </>
        }
      >
        {detailQuery.isPending ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" />
          </div>
        ) : null}
        {detail ? (
          <>
            <DrawerSection title="Datos">
              <DrawerField label="ID">{detail.id}</DrawerField>
              <DrawerField label="Nombre">{detail.nombre || '—'}</DrawerField>
              <DrawerField label="Correo">{detail.correo || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Disciplinas asignadas">
              {detailAsig.length === 0 ? (
                <p className="small text-muted mb-0">Sin disciplinas asignadas.</p>
              ) : (
                <ul className="list-unstyled mb-0 small">
                  {detailAsig.map((a) => (
                    <li key={`${a.actividad}-${a.estado}`} className="mb-2 pb-2 border-bottom">
                      <div className="fw-semibold">{a.nombreActividad || a.actividad || '—'}</div>
                      <div className="text-muted">
                        {a.estado || 'ACTIVO'}
                        {a.apoyo ? ' · Apoyo en salidas' : ''}
                        {a.lider ? ' · Líder' : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>
            <DrawerSection title="Cursos asignados (Docente)">
              {detailCursos.length === 0 ? (
                <p className="small text-muted mb-0">
                  Ningún curso tiene este entrenador como docente (ID o correo).
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Sede</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCursos.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="fw-semibold">{c.nombreCorto || c.nombre || c.id}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {c.id}
                              {c.nombreActividad ? ` · ${c.nombreActividad}` : ''}
                            </div>
                          </td>
                          <td>{c.sede || '—'}</td>
                          <td>{c.estado || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DrawerSection>
          </>
        ) : null}
      </GestionPanel>

      <EntrenadorFormPanel
        key={creating ? 'new' : `edit-${editing?.id}-${editDetailQuery.dataUpdatedAt || 0}`}
        open={(creating || Boolean(editing)) && formReady}
        title={creating ? 'Nuevo entrenador' : 'Editar entrenador'}
        initial={editInitial}
        actividadOptions={actividadOptions}
        idLocked={!creating}
        isPending={saveMut.isPending}
        error={saveMut.error?.message}
        onClose={() => {
          setCreating(false);
          setEditing(null);
          saveMut.reset();
        }}
        onSubmit={(form) => saveMut.mutate(form)}
      />

      {canCreate ? (
        <GestionFab
          canCreate
          newTitle="Nuevo entrenador"
          onNew={() => {
            setSelectedId(null);
            setEditing(null);
            setCreating(true);
          }}
        />
      ) : null}

      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}
