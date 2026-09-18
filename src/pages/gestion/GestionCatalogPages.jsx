import { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isAdminLike, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { canGestion, useGestionPermisos } from '../../lib/useGestionPermisos.js';
import { formatFechaCorta, toDateInput } from '../../lib/formatDate.js';
import { formatCurrencyCop, MESES_LABEL } from '../../lib/gestionFormat.js';
import { IconPencil } from '../../components/gestion/GestionIcons.jsx';
import { SearchableSelect } from '../../components/gestion/SearchableSelect.jsx';
import { SortableTh, sortRows, toggleColumnSort } from '../../components/gestion/SortableTh.jsx';
import { GestionNav } from '../../components/gestion/GestionNav.jsx';
import { GestionFab } from '../../components/gestion/GestionFab.jsx';
import { DrawerField, DrawerSection } from '../../components/gestion/SlideDrawer.jsx';
import { GestionPanel, GestionPanelModeToggle } from '../../components/gestion/GestionPanel.jsx';
import { AttToast, useAttToast } from '../../components/AttToast.jsx';
import {
  TIPOS_DOC_PARTICIPANTE,
  TIPOS_DOC_RESPONSABLE,
  TIPOS_PERSONA_RESPONSABLE,
  INTERNO_EXTERNO_OPTS,
  buildNombreCompleto,
} from '../../lib/gestionCatalogConstants.js';

const SEDES_CURSO = [
  { value: 'MEDELLÍN', label: 'MEDELLÍN' },
  { value: 'RETIRO', label: 'RETIRO' },
];
const ESTADOS_CURSO = [
  { value: 'ACTIVO', label: 'ACTIVO' },
  { value: 'INACTIVO', label: 'INACTIVO' },
];
const DIAS_CURSO = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
];

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function isDayOn(value) {
  const s = String(value ?? '').trim().toUpperCase();
  return s === 'X' || s === 'SI' || s === '1' || s === 'TRUE';
}

function foldText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function matchSelectValue(options, raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const exact = options.find((o) => String(o.value) === s);
  if (exact) return exact.value;
  const folded = foldText(s);
  const fuzzy = options.find((o) => foldText(o.value) === folded || foldText(o.label) === folded);
  return fuzzy ? fuzzy.value : s;
}

function toParticipanteForm(row) {
  if (!row) return {};
  const tipoDocumento = matchSelectValue(TIPOS_DOC_PARTICIPANTE, row.tipoDocumento);
  return {
    ...row,
    tipoDocumento,
    internoExterno: matchSelectValue(INTERNO_EXTERNO_OPTS, row.internoExterno),
    fechaNacimiento: toDateInput(row.fechaNacimiento),
    primerNombre: row.primerNombre || '',
    segundoNombre: row.segundoNombre || '',
    primerApellido: row.primerApellido || '',
    segundoApellido: row.segundoApellido || '',
  };
}

function withCurrentOption(options, value) {
  const s = String(value ?? '').trim();
  if (!s || options.some((o) => String(o.value) === s)) return options;
  return [{ value: s, label: s }, ...options];
}

function renderFormField(f, form, setForm) {
  return (
    <div key={f.key} className={f.col || 'col-md-6'}>
      <label className="form-label small">{f.label}</label>
      {f.type === 'select' ? (
        <SearchableSelect
          value={form[f.key] || ''}
          onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
          options={f.options || []}
          placeholder={f.placeholder || 'Seleccione…'}
          allowClear={f.allowClear !== false}
          onSearchChange={f.onSearchChange}
          disabled={f.disabled}
        />
      ) : f.type === 'textarea' ? (
        <textarea
          className="form-control form-control-sm"
          rows={f.rows || 2}
          value={form[f.key] || ''}
          disabled={f.disabled}
          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
        />
      ) : (
        <input
          type={f.type || 'text'}
          className="form-control form-control-sm"
          value={form[f.key] || ''}
          disabled={f.disabled}
          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
        />
      )}
      {f.hint ? <div className="form-text">{f.hint}</div> : null}
    </div>
  );
}

function EntityFormModal({ open, title, hint, sections, fields, initial, onClose, onSubmit, isPending, error }) {
  const [form, setForm] = useState(() => initial || {});

  useEffect(() => {
    if (open) setForm(initial || {});
    // Solo al abrir / cambiar de registro (ver `key` del padre).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const resolvedSections =
    sections?.length > 0
      ? sections
      : [{ title: null, fields: fields || [] }];

  return (
    <GestionPanel
      open={open}
      onClose={onClose}
      title={title}
      subtitle={hint}
      width={560}
      className="att-form-modal"
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
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
      {error ? <div className="alert alert-danger small">{error}</div> : null}
      {resolvedSections.map((section, idx) => (
        <div key={section.title || `sec-${idx}`} className="att-form-section">
          {section.title ? <h6 className="att-form-section__title">{section.title}</h6> : null}
          <div className="row g-2">
            {(section.fields || []).map((f) => renderFormField(f, form, setForm))}
          </div>
        </div>
      ))}
    </GestionPanel>
  );
}

function emptyCursoForm(tipo) {
  return {
    id: '',
    nombre: '',
    nombreCorto: '',
    tipo: String(tipo || '1'),
    sede: 'MEDELLÍN',
    tarifa: '',
    codigoFacturacion: '',
    estado: 'ACTIVO',
    actividad: '',
    linea: '',
    docente: '',
    cuposMinimos: '',
    cuposMaximos: '',
    fechaInicio: '',
    fechaFinal: '',
    lunes: '',
    martes: '',
    miercoles: '',
    jueves: '',
    viernes: '',
    sabado: '',
  };
}

function CursoFormModal({
  open,
  editing,
  tipoDefault,
  tiposOptions,
  onClose,
  onSubmit,
  isPending,
  error,
}) {
  const [form, setForm] = useState(() => emptyCursoForm(tipoDefault));
  const [docenteQ, setDocenteQ] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        ...emptyCursoForm(tipoDefault),
        ...editing,
        tipo: String(editing.tipo || tipoDefault || '1'),
        actividad: editing.actividad != null ? String(editing.actividad) : '',
        linea: editing.linea != null ? String(editing.linea) : '',
        docente: editing.docente != null ? String(editing.docente) : '',
        tarifa: digitsOnly(editing.tarifa),
        estado: editing.estado || 'ACTIVO',
        sede: editing.sede || 'MEDELLÍN',
        cuposMinimos:
          editing.cuposMinimos != null && String(editing.cuposMinimos).trim() !== ''
            ? String(editing.cuposMinimos)
            : '',
        cuposMaximos:
          editing.cuposMaximos != null && String(editing.cuposMaximos).trim() !== ''
            ? String(editing.cuposMaximos)
            : '',
        fechaInicio: toDateInput(editing.fechaInicio),
        fechaFinal: toDateInput(editing.fechaFinal),
        lunes: isDayOn(editing.lunes) ? 'X' : '',
        martes: isDayOn(editing.martes) ? 'X' : '',
        miercoles: isDayOn(editing.miercoles) ? 'X' : '',
        jueves: isDayOn(editing.jueves) ? 'X' : '',
        viernes: isDayOn(editing.viernes) ? 'X' : '',
        sabado: isDayOn(editing.sabado) ? 'X' : '',
      });
    } else {
      setForm(emptyCursoForm(tipoDefault));
    }
    setDocenteQ('');
  }, [open, editing, tipoDefault]);

  const actQuery = useQuery({
    queryKey: ['gestion-catalog-actividades'],
    queryFn: () => getJson('/api/gestion/catalogos/actividades'),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const linQuery = useQuery({
    queryKey: ['gestion-catalog-lineas'],
    queryFn: () => getJson('/api/gestion/catalogos/lineas'),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const entQuery = useQuery({
    queryKey: ['gestion-catalog-entrenadores', docenteQ],
    queryFn: () =>
      getJson(`/api/gestion/catalogos/entrenadores?q=${encodeURIComponent(docenteQ)}`),
    enabled: open,
    staleTime: 30_000,
  });

  const actividadOptions = useMemo(
    () =>
      (actQuery.data?.actividades || []).map((a) => ({
        value: String(a.id),
        label: a.nombre || String(a.id),
      })),
    [actQuery.data],
  );
  const lineaOptions = useMemo(
    () =>
      (linQuery.data?.lineas || []).map((l) => ({
        value: String(l.id),
        label: l.nombre || String(l.id),
      })),
    [linQuery.data],
  );
  const docenteOptions = useMemo(() => {
    const rows = (entQuery.data?.entrenadores || []).map((e) => ({
      value: String(e.id),
      label: `${e.nombre || 'Sin nombre'}${e.correo ? ` · ${e.correo}` : ''}`,
      searchText: `${e.nombre} ${e.correo} ${e.id}`,
    }));
    if (form.docente && !rows.some((o) => String(o.value) === String(form.docente))) {
      rows.unshift({
        value: String(form.docente),
        label: editing?.nombreDocente
          ? `${editing.nombreDocente} (${form.docente})`
          : String(form.docente),
      });
    }
    return rows;
  }, [entQuery.data, form.docente, editing]);

  if (!open) return null;

  return (
    <GestionPanel
      open={open}
      onClose={onClose}
      title={editing ? 'Editar curso' : 'Nuevo curso'}
      subtitle={"Complete la identificación, operación y horario del curso."}
      width={560}
      className="att-form-modal"
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
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
          {error ? <div className="alert alert-danger small">{error}</div> : null}

          <div className="att-form-section">
            <h6 className="att-form-section__title">Identificación</h6>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">ID curso</label>
                <input
                  className="form-control form-control-sm"
                  value={form.id}
                  disabled={Boolean(editing)}
                  onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label small">Nombre del curso</label>
                <input
                  className="form-control form-control-sm"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Nombre corto</label>
                <input
                  className="form-control form-control-sm"
                  value={form.nombreCorto}
                  onChange={(e) => setForm((p) => ({ ...p, nombreCorto: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Tipo</label>
                <SearchableSelect
                  value={form.tipo}
                  onChange={(v) => setForm((p) => ({ ...p, tipo: v }))}
                  options={tiposOptions}
                  allowClear={false}
                />
              </div>
            </div>
          </div>

          <div className="att-form-section">
            <h6 className="att-form-section__title">Operación</h6>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Sede</label>
                <SearchableSelect
                  value={form.sede}
                  onChange={(v) => setForm((p) => ({ ...p, sede: v }))}
                  options={SEDES_CURSO}
                  allowClear={false}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Estado</label>
                <SearchableSelect
                  value={form.estado}
                  onChange={(v) => setForm((p) => ({ ...p, estado: v }))}
                  options={ESTADOS_CURSO}
                  allowClear={false}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Tarifa / costo</label>
                <input
                  className="form-control form-control-sm"
                  inputMode="numeric"
                  placeholder="$ 0"
                  value={form.tarifa ? formatCurrencyCop(form.tarifa) : ''}
                  onChange={(e) => setForm((p) => ({ ...p, tarifa: digitsOnly(e.target.value) }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Código de facturación</label>
                <input
                  className="form-control form-control-sm"
                  value={form.codigoFacturacion}
                  onChange={(e) => setForm((p) => ({ ...p, codigoFacturacion: e.target.value }))}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Cupos mínimos</label>
                <input
                  className="form-control form-control-sm"
                  inputMode="numeric"
                  value={form.cuposMinimos}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cuposMinimos: digitsOnly(e.target.value) }))
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Cupos máximos</label>
                <input
                  className="form-control form-control-sm"
                  inputMode="numeric"
                  value={form.cuposMaximos}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cuposMaximos: digitsOnly(e.target.value) }))
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Fecha de inicio</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={form.fechaInicio || ''}
                  onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Fecha final</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={form.fechaFinal || ''}
                  onChange={(e) => setForm((p) => ({ ...p, fechaFinal: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="att-form-section">
            <h6 className="att-form-section__title">Clasificación</h6>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label small">Actividad</label>
                <SearchableSelect
                  value={form.actividad}
                  onChange={(v) => setForm((p) => ({ ...p, actividad: v }))}
                  options={actividadOptions}
                  placeholder="Seleccione actividad…"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Línea</label>
                <SearchableSelect
                  value={form.linea}
                  onChange={(v) => setForm((p) => ({ ...p, linea: v }))}
                  options={lineaOptions}
                  placeholder="Seleccione línea…"
                />
              </div>
              <div className="col-12">
                <label className="form-label small">Docente</label>
                <SearchableSelect
                  value={form.docente}
                  onChange={(v) => setForm((p) => ({ ...p, docente: v }))}
                  options={docenteOptions}
                  placeholder="Buscar docente…"
                  onSearchChange={setDocenteQ}
                />
              </div>
            </div>
          </div>

          <div className="att-form-section">
            <h6 className="att-form-section__title">Días en los que se brinda</h6>
            <div className="att-dias-grid">
              {DIAS_CURSO.map((d) => {
                const on = isDayOn(form[d.key]);
                return (
                  <label key={d.key} className={`att-dias-chip ${on ? 'is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [d.key]: e.target.checked ? 'X' : '' }))
                      }
                    />
                    {d.label}
                  </label>
                );
              })}
            </div>
          </div>
    </GestionPanel>
  );
}

export function GestionParticipantesPage() {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const canCreate = canGestion(permisosQuery.data, 'participantes', 'crear');
  const canEdit = canGestion(permisosQuery.data, 'participantes', 'editar');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sort: 'nombre', dir: 'asc' });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [respQ, setRespQ] = useState('');
  const { toast, showToast, setToast } = useAttToast();

  const onSort = (column) => {
    setSort((current) => toggleColumnSort(current, column));
    setPage(1);
  };

  const query = useQuery({
    queryKey: ['gestion-participantes', q, page, sort.sort, sort.dir],
    queryFn: () =>
      getJson(
        `/api/gestion/participantes?page=${page}&limit=40&q=${encodeURIComponent(q)}&sort=${encodeURIComponent(sort.sort)}&dir=${encodeURIComponent(sort.dir)}`,
      ),
    enabled: isAdminLike(user),
  });

  const detailQuery = useQuery({
    queryKey: ['gestion-ficha', 'participante', selectedDoc],
    queryFn: () => getJson(`/api/gestion/participantes/${encodeURIComponent(selectedDoc)}`),
    enabled: Boolean(selectedDoc),
  });

  const editLoadQuery = useQuery({
    queryKey: ['gestion-ficha', 'participante', editing?.documento, 'edit'],
    queryFn: () => getJson(`/api/gestion/participantes/${encodeURIComponent(editing.documento)}`),
    enabled: Boolean(editing?.documento) && !creating,
  });

  const respQuery = useQuery({
    queryKey: ['gestion-entity-opts', 'responsables', respQ],
    queryFn: () =>
      getJson(`/api/gestion/responsables?limit=80&q=${encodeURIComponent(respQ)}`),
    enabled: isAdminLike(user) && (creating || Boolean(editing)),
    staleTime: 20_000,
  });

  const saveMut = useMutation({
    mutationFn: (form) => {
      if (editing?.documento) {
        return patchJson(`/api/gestion/participantes/${encodeURIComponent(editing.documento)}`, form);
      }
      return postJson('/api/gestion/participantes', form);
    },
    onSuccess: async (_data, form) => {
      const wasEdit = Boolean(editing?.documento);
      setQ('');
      setPage(1);
      setEditing(null);
      setCreating(false);
      if (form?.documento) setSelectedDoc(String(form.documento));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gestion-participantes'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-ficha', 'participante'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-entity-opts', 'participantes'] }),
      ]);
      showToast('success', wasEdit ? 'Participante actualizado' : 'Participante creado');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar el participante'),
  });

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const rows = query.data?.participantes || [];
  const meta = query.data?.meta || { page: 1, totalPages: 1, total: 0 };
  const detail = detailQuery.data?.participante;
  const selectedRow = rows.find((r) => String(r.documento) === String(selectedDoc));

  const respOptions = (respQuery.data?.responsables || []).map((r) => ({
    value: r.documento,
    label: `${r.nombreCompleto || 'Sin nombre'} (${r.documento})`,
  }));
  const editBase = editing || detail || selectedRow;
  if (
    editBase?.idResponsable &&
    !respOptions.some((o) => String(o.value) === String(editBase.idResponsable))
  ) {
    respOptions.unshift({
      value: editBase.idResponsable,
      label: editBase.nombreResponsable
        ? `${editBase.nombreResponsable} (${editBase.idResponsable})`
        : String(editBase.idResponsable),
    });
  }

  const sections = [
    {
      title: 'Identificación',
      fields: [
        { key: 'documento', label: 'Documento', disabled: Boolean(editing), col: 'col-md-4' },
        {
          key: 'tipoDocumento',
          label: 'Tipo de documento',
          type: 'select',
          options: withCurrentOption(
            TIPOS_DOC_PARTICIPANTE,
            editLoadQuery.data?.participante?.tipoDocumento || editing?.tipoDocumento,
          ),
          allowClear: false,
          col: 'col-md-4',
        },
        {
          key: 'internoExterno',
          label: 'Interno / externo',
          type: 'select',
          options: INTERNO_EXTERNO_OPTS,
          col: 'col-md-4',
        },
      ],
    },
    {
      title: 'Nombres',
      fields: [
        { key: 'primerNombre', label: 'Primer nombre', col: 'col-md-6' },
        { key: 'segundoNombre', label: 'Segundo nombre', col: 'col-md-6' },
        { key: 'primerApellido', label: 'Primer apellido', col: 'col-md-6' },
        { key: 'segundoApellido', label: 'Segundo apellido', col: 'col-md-6' },
        { key: 'grupo', label: 'Grupo', col: 'col-md-6' },
        { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date', col: 'col-md-6' },
      ],
    },
    {
      title: 'Responsable',
      fields: [
        {
          key: 'idResponsable',
          label: 'Responsable asignado',
          type: 'select',
          options: respOptions,
          placeholder: 'Buscar responsable…',
          onSearchChange: setRespQ,
          col: 'col-12',
        },
      ],
    },
  ];

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
          placeholder="Buscar por nombre, documento o responsable…"
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
            <thead className="att-sortable-head">
              <tr>
                <SortableTh label="Documento" column="documento" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <SortableTh label="Nombre completo" column="nombre" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <SortableTh label="Grupo" column="grupo" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <SortableTh label="Responsable" column="responsable" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.isPending ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </td>
                </tr>
              ) : null}
              {!query.isPending && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">Sin participantes</td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr
                  key={r.documento || `p-${r.nombreCompleto}`}
                  className={`att-split-row ${selectedDoc === r.documento ? 'is-selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedDoc(r.documento)}
                >
                  <td data-label="Documento">{r.documento}</td>
                  <td data-label="Nombre">{r.nombreCompleto}</td>
                  <td data-label="Grupo">{r.grupo || '—'}</td>
                  <td data-label="Responsable">{r.nombreResponsable || r.idResponsable || '—'}</td>
                  <td data-label="" onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm"
                        title="Editar"
                        onClick={() => {
                          setSelectedDoc(null);
                          setEditing(toParticipanteForm(r));
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
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <span className="text-nowrap">Pág. {meta.page} / {meta.totalPages}</span>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      <GestionPanel
        open={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        eyebrow="Participante"
        title={detail?.nombreCompleto || selectedRow?.nombreCompleto || 'Detalle'}
        subtitle={detail?.documento || selectedDoc}
        width={520}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedDoc(null)}>
              Cerrar
            </button>
            {canEdit && (detail || selectedRow) ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditing(toParticipanteForm(detail || selectedRow));
                  setSelectedDoc(null);
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
            <DrawerSection title="Identificación">
              <DrawerField label="Documento">{detail.documento}</DrawerField>
              <DrawerField label="Tipo documento">{detail.tipoDocumento || '—'}</DrawerField>
              <DrawerField label="Interno / externo">{detail.internoExterno || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Nombres">
              <DrawerField label="Primer nombre">{detail.primerNombre || '—'}</DrawerField>
              <DrawerField label="Segundo nombre">{detail.segundoNombre || '—'}</DrawerField>
              <DrawerField label="Primer apellido">{detail.primerApellido || '—'}</DrawerField>
              <DrawerField label="Segundo apellido">{detail.segundoApellido || '—'}</DrawerField>
              <DrawerField label="Nombre completo">{detail.nombreCompleto || '—'}</DrawerField>
              <DrawerField label="Grupo">{detail.grupo || '—'}</DrawerField>
              <DrawerField label="Nacimiento">{formatFechaCorta(detail.fechaNacimiento)}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Responsable">
              <DrawerField label="Documento">{detail.idResponsable || '—'}</DrawerField>
              <DrawerField label="Nombre">{detail.nombreResponsable || '—'}</DrawerField>
              <DrawerField label="Celular">{detail.celularResponsable || '—'}</DrawerField>
              <DrawerField label="Correo">{detail.correoResponsable || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Padre">
              <DrawerField label="Documento">{detail.documentoPadre || '—'}</DrawerField>
              <DrawerField label="Nombre">{detail.nombrePadre || '—'}</DrawerField>
              <DrawerField label="Celular">{detail.celularPadre || '—'}</DrawerField>
              <DrawerField label="Correo">{detail.emailPadre || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Madre">
              <DrawerField label="Documento">{detail.documentoMadre || '—'}</DrawerField>
              <DrawerField label="Nombre">{detail.nombreMadre || '—'}</DrawerField>
              <DrawerField label="Celular">{detail.celularMadre || '—'}</DrawerField>
              <DrawerField label="Correo">{detail.emailMadre || '—'}</DrawerField>
            </DrawerSection>
          </>
        ) : null}
      </GestionPanel>

      <EntityFormModal
        key={creating ? 'new-part' : `edit-${editing?.documento}-${editLoadQuery.dataUpdatedAt || 0}`}
        open={creating || (Boolean(editing) && !editLoadQuery.isPending)}
        title={editing ? 'Editar participante' : 'Nuevo participante'}
        hint="El nombre completo se arma con primer/segundo nombre y apellidos."
        sections={sections}
        initial={creating ? {} : toParticipanteForm(editLoadQuery.data?.participante || editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(form) =>
          saveMut.mutate({
            ...form,
            nombreCompleto: buildNombreCompleto(
              form.primerNombre,
              form.segundoNombre,
              form.primerApellido,
              form.segundoApellido,
            ),
          })
        }
        isPending={saveMut.isPending}
        error={saveMut.error?.message}
      />

      <GestionFab
        canCreate={canCreate}
        newTitle="Nuevo participante"
        onNew={() => setCreating(true)}
      />

      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}

function ResponsableFormModal({
  open,
  title,
  initial,
  onClose,
  onSubmit,
  isPending,
  error,
}) {
  const [form, setForm] = useState(() => initial || {});
  const [depto, setDepto] = useState('');

  const deptosQuery = useQuery({
    queryKey: ['gestion-catalog-departamentos'],
    queryFn: () => getJson('/api/gestion/catalogos/departamentos'),
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const ciudadesQuery = useQuery({
    queryKey: ['gestion-catalog-ciudades', depto],
    queryFn: () =>
      getJson(`/api/gestion/catalogos/ciudades?depto=${encodeURIComponent(depto)}`),
    enabled: open && Boolean(depto),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const base = initial || {};
    setForm(base);
    setDepto(String(base.departamento || '').trim());
  }, [open, initial]);

  const resolveDeptoFromCiudad = useQuery({
    queryKey: ['gestion-catalog-ciudades-all-resolve', form.ciudad],
    queryFn: () => getJson('/api/gestion/catalogos/ciudades'),
    enabled: open && Boolean(form.ciudad) && !depto,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (depto || !form.ciudad) return;
    const rows = resolveDeptoFromCiudad.data?.ciudades || [];
    const ciudadVal = String(form.ciudad).trim();
    const hit = rows.find(
      (c) =>
        String(c.nombre).toLowerCase() === ciudadVal.toLowerCase() ||
        String(c.codigo) === ciudadVal ||
        String(c.codigo) === ciudadVal.padStart(5, '0'),
    );
    if (hit?.depto) setDepto(String(hit.depto));
  }, [resolveDeptoFromCiudad.data, form.ciudad, depto]);

  if (!open) return null;

  const deptoOptions = (deptosQuery.data?.departamentos || []).map((d) => ({
    value: d.codigo,
    label: d.nombre,
  }));
  const ciudadOptions = (ciudadesQuery.data?.ciudades || []).map((c) => ({
    value: c.nombre,
    label: c.nombre,
    searchText: `${c.nombre} ${c.codigo}`,
  }));

  return (
    <GestionPanel
      open={open}
      onClose={onClose}
      title={title}
      subtitle={"Departamento y ciudad desde el catálogo oficial."}
      width={560}
      className="att-form-modal"
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isPending}
            onClick={() => onSubmit({
              ...form,
              nombreCompleto: buildNombreCompleto(form.nombres, form.apellidos),
            })}
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
          {error ? <div className="alert alert-danger small">{error}</div> : null}
          <div className="att-form-section">
            <h6 className="att-form-section__title">Identificación</h6>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Documento</label>
                <input
                  className="form-control form-control-sm"
                  value={form.documento || ''}
                  disabled={Boolean(initial?.documento)}
                  onChange={(e) => setForm((p) => ({ ...p, documento: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Tipo de identificación</label>
                <SearchableSelect
                  value={form.tipoIdentificacion || ''}
                  onChange={(v) => setForm((p) => ({ ...p, tipoIdentificacion: v }))}
                  options={TIPOS_DOC_RESPONSABLE}
                  allowClear={false}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Tipo de persona</label>
                <SearchableSelect
                  value={form.tipoPersona || ''}
                  onChange={(v) => setForm((p) => ({ ...p, tipoPersona: v }))}
                  options={TIPOS_PERSONA_RESPONSABLE}
                  allowClear={false}
                />
              </div>
            </div>
          </div>
          <div className="att-form-section">
            <h6 className="att-form-section__title">Nombre</h6>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label small">Nombres</label>
                <input
                  className="form-control form-control-sm"
                  value={form.nombres || ''}
                  onChange={(e) => setForm((p) => ({ ...p, nombres: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Apellidos</label>
                <input
                  className="form-control form-control-sm"
                  value={form.apellidos || ''}
                  onChange={(e) => setForm((p) => ({ ...p, apellidos: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="att-form-section">
            <h6 className="att-form-section__title">Contacto y ubicación</h6>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label small">Celular</label>
                <input
                  className="form-control form-control-sm"
                  value={form.celular || ''}
                  onChange={(e) => setForm((p) => ({ ...p, celular: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Correo</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  value={form.correo || ''}
                  onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Departamento</label>
                <SearchableSelect
                  value={depto}
                  onChange={(v) => {
                    setDepto(v || '');
                    setForm((p) => ({ ...p, ciudad: '', departamento: v || '' }));
                  }}
                  options={deptoOptions}
                  placeholder="Seleccione departamento…"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Ciudad</label>
                <SearchableSelect
                  value={form.ciudad || ''}
                  onChange={(v) => setForm((p) => ({ ...p, ciudad: v }))}
                  options={ciudadOptions}
                  placeholder={depto ? 'Seleccione ciudad…' : 'Elija departamento primero'}
                  disabled={!depto}
                />
              </div>
              <div className="col-12">
                <label className="form-label small">Dirección</label>
                <input
                  className="form-control form-control-sm"
                  value={form.direccion || ''}
                  onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                />
              </div>
            </div>
          </div>
    </GestionPanel>
  );
}

export function GestionResponsablesPage() {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const canCreate = canGestion(permisosQuery.data, 'responsables', 'crear');
  const canEdit = canGestion(permisosQuery.data, 'responsables', 'editar');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sort: 'nombre', dir: 'asc' });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const { toast, showToast, setToast } = useAttToast();

  const onSort = (column) => {
    setSort((current) => toggleColumnSort(current, column));
    setPage(1);
  };

  const query = useQuery({
    queryKey: ['gestion-responsables', q, page, sort.sort, sort.dir],
    queryFn: () =>
      getJson(
        `/api/gestion/responsables?page=${page}&limit=40&q=${encodeURIComponent(q)}&sort=${encodeURIComponent(sort.sort)}&dir=${encodeURIComponent(sort.dir)}`,
      ),
    enabled: isAdminLike(user),
  });

  const detailQuery = useQuery({
    queryKey: ['gestion-ficha', 'responsable', selectedDoc],
    queryFn: () => getJson(`/api/gestion/responsables/${encodeURIComponent(selectedDoc)}`),
    enabled: Boolean(selectedDoc),
  });

  const saveMut = useMutation({
    mutationFn: (form) => {
      if (editing?.documento) {
        return patchJson(`/api/gestion/responsables/${encodeURIComponent(editing.documento)}`, form);
      }
      return postJson('/api/gestion/responsables', form);
    },
    onSuccess: async (_data, form) => {
      const wasEdit = Boolean(editing?.documento);
      setQ('');
      setPage(1);
      setEditing(null);
      setCreating(false);
      if (form?.documento) setSelectedDoc(String(form.documento));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gestion-responsables'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-ficha', 'responsable'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-entity-opts', 'responsables'] }),
      ]);
      showToast('success', wasEdit ? 'Responsable actualizado' : 'Responsable creado');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar el responsable'),
  });

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const rows = query.data?.responsables || [];
  const meta = query.data?.meta || { page: 1, totalPages: 1, total: 0 };
  const detail = detailQuery.data?.responsable;
  const selectedRow = rows.find((r) => String(r.documento) === String(selectedDoc));
  const editingInitial = editing
    ? {
        ...editing,
        departamento: editing.departamento || detail?.departamento || '',
      }
    : {};

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
          placeholder="Buscar…"
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
            <thead className="att-sortable-head">
              <tr>
                <SortableTh label="Documento" column="documento" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <SortableTh label="Nombre completo" column="nombre" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <SortableTh label="Celular" column="celular" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <SortableTh label="Correo" column="correo" sort={sort.sort} dir={sort.dir} onSort={onSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.isPending ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </td>
                </tr>
              ) : null}
              {!query.isPending && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">Sin responsables</td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr
                  key={r.documento || `r-${r.nombreCompleto}`}
                  className={`att-split-row ${selectedDoc === r.documento ? 'is-selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedDoc(r.documento)}
                >
                  <td data-label="Documento">{r.documento}</td>
                  <td data-label="Nombre">{r.nombreCompleto}</td>
                  <td data-label="Celular">{r.celular || '—'}</td>
                  <td data-label="Correo">{r.correo || '—'}</td>
                  <td data-label="" onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm"
                        title="Editar"
                        onClick={() => {
                          setSelectedDoc(null);
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
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <span className="text-nowrap">Pág. {meta.page} / {meta.totalPages}</span>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      <GestionPanel
        open={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        eyebrow="Responsable"
        title={detail?.nombreCompleto || selectedRow?.nombreCompleto || 'Detalle'}
        subtitle={detail?.documento || selectedDoc}
        width={520}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedDoc(null)}>
              Cerrar
            </button>
            {canEdit && (detail || selectedRow) ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditing(detail || selectedRow);
                  setSelectedDoc(null);
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
            <DrawerSection title="Identificación">
              <DrawerField label="Documento">{detail.documento}</DrawerField>
              <DrawerField label="Tipo identificación">{detail.tipoIdentificacion || '—'}</DrawerField>
              <DrawerField label="Tipo persona">{detail.tipoPersona || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Nombre">
              <DrawerField label="Nombre completo">{detail.nombreCompleto || '—'}</DrawerField>
              <DrawerField label="Nombres">{detail.nombres || '—'}</DrawerField>
              <DrawerField label="Apellidos">{detail.apellidos || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Contacto">
              <DrawerField label="Celular">{detail.celular || '—'}</DrawerField>
              <DrawerField label="Correo">{detail.correo || '—'}</DrawerField>
              <DrawerField label="Departamento">{detail.nombreDepartamento || detail.departamento || '—'}</DrawerField>
              <DrawerField label="Ciudad">{detail.nombreCiudad || detail.ciudad || '—'}</DrawerField>
              <DrawerField label="Dirección">{detail.direccion || '—'}</DrawerField>
            </DrawerSection>
          </>
        ) : null}
      </GestionPanel>

      <ResponsableFormModal
        key={editing?.documento || (creating ? 'new-resp' : 'closed')}
        open={creating || Boolean(editing)}
        title={editing ? 'Editar responsable' : 'Nuevo responsable'}
        initial={editing ? editingInitial : {}}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(form) => saveMut.mutate(form)}
        isPending={saveMut.isPending}
        error={saveMut.error?.message}
      />

      <GestionFab
        canCreate={canCreate}
        newTitle="Nuevo responsable"
        onNew={() => setCreating(true)}
      />

      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}

export function GestionCursosCatalogPage() {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const canCreate = canGestion(permisosQuery.data, 'cursos', 'crear');
  const canEdit = canGestion(permisosQuery.data, 'cursos', 'editar');
  const [tipo, setTipo] = useState('1');
  const [q, setQ] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [actividadFiltro, setActividadFiltro] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sort, setSort] = useState({ sort: 'nombre', dir: 'asc' });
  const { toast, showToast, setToast } = useAttToast();

  const tiposQuery = useQuery({
    queryKey: ['gestion-tipos'],
    queryFn: () => getJson('/api/gestion/tipos'),
    staleTime: 5 * 60_000,
    enabled: isAdminLike(user),
  });

  const actQuery = useQuery({
    queryKey: ['gestion-catalog-actividades'],
    queryFn: () => getJson('/api/gestion/catalogos/actividades'),
    staleTime: 5 * 60_000,
    enabled: isAdminLike(user),
  });

  const listParams = useMemo(() => {
    const u = new URLSearchParams();
    u.set('soloActivos', 'false');
    if (tipo) u.set('tipo', tipo);
    if (q) u.set('q', q);
    if (sedeFiltro) u.set('sede', sedeFiltro);
    if (estadoFiltro) u.set('estado', estadoFiltro);
    if (actividadFiltro) u.set('actividad', actividadFiltro);
    return u.toString();
  }, [tipo, q, sedeFiltro, estadoFiltro, actividadFiltro]);

  const query = useQuery({
    queryKey: ['gestion-cursos-catalog', listParams],
    queryFn: () => getJson(`/api/gestion/cursos?${listParams}`),
    enabled: isAdminLike(user) && Boolean(tipo),
  });

  const saveMut = useMutation({
    mutationFn: (form) => {
      const payload = {
        id: form.id,
        nombre: form.nombre,
        nombreCorto: form.nombreCorto,
        tipo: Number(form.tipo || tipo),
        tarifa: digitsOnly(form.tarifa) || null,
        codigoFacturacion: form.codigoFacturacion || null,
        actividad: form.actividad || null,
        linea: form.linea || null,
        docente: form.docente || null,
        estado: form.estado || 'ACTIVO',
        sede: form.sede || null,
        cuposMinimos: form.cuposMinimos === '' ? null : digitsOnly(form.cuposMinimos) || null,
        cuposMaximos: form.cuposMaximos === '' ? null : digitsOnly(form.cuposMaximos) || null,
        fechaInicio: toDateInput(form.fechaInicio) || null,
        fechaFinal: toDateInput(form.fechaFinal) || null,
        lunes: form.lunes || null,
        martes: form.martes || null,
        miercoles: form.miercoles || null,
        jueves: form.jueves || null,
        viernes: form.viernes || null,
        sabado: form.sabado || null,
      };
      if (editing?.id) return patchJson(`/api/gestion/cursos/${encodeURIComponent(editing.id)}`, payload);
      return postJson('/api/gestion/cursos', payload);
    },
    onSuccess: async (_data, form) => {
      const wasEdit = Boolean(editing?.id);
      setEditing(null);
      setCreating(false);
      if (form?.id) setSelectedId(String(form.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gestion-cursos-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-cursos'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-cursos-sidebar'] }),
        queryClient.invalidateQueries({ queryKey: ['gestion-filtros-meta'] }),
      ]);
      showToast('success', wasEdit ? 'Curso actualizado' : 'Curso creado');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar el curso'),
  });

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const tiposOptions = (tiposQuery.data?.tipos || []).map((t) => ({
    value: String(t.id),
    label: `${t.nombre} (${t.id})`,
  }));
  const actividadOptions = (actQuery.data?.actividades || []).map((a) => ({
    value: String(a.id),
    label: a.nombre || String(a.id),
  }));
  const rows = sortRows(query.data?.cursos || [], sort.sort, sort.dir, (row, column) => {
    if (column === 'id') return row.id;
    if (column === 'nombre') return row.nombreCorto || row.nombre || '';
    if (column === 'sede') return row.sede || '';
    if (column === 'tarifa') return Number(String(row.tarifa ?? '').replace(/\D/g, '')) || 0;
    if (column === 'cupos') return Number(row.cuposLlenos || 0);
    if (column === 'estado') return row.estado || '';
    return '';
  });
  const periodoCupos = query.data?.meta?.periodoCupos || [];
  const selected = rows.find((c) => String(c.id) === String(selectedId)) || null;

  const diasResumen = (c) =>
    DIAS_CURSO.filter((d) => isDayOn(c[d.key]))
      .map((d) => d.label.slice(0, 3))
      .join(' · ') || '—';

  const exportExcel = async () => {
    try {
      setExporting(true);
      const { exportRowsToExcel } = await import('../../lib/exportExcel.js');
      await exportRowsToExcel({
        rows,
        sheetName: 'Cursos',
        fileNamePrefix: `cursos_tipo_${tipo}`,
        columns: [
          { key: 'id', header: 'ID' },
          { key: 'nombre', header: 'Nombre' },
          { key: 'nombreCorto', header: 'Nombre corto' },
          { key: 'sede', header: 'Sede' },
          { key: 'tarifa', header: 'Tarifa', format: (v) => formatCurrencyCop(v) },
          { key: 'estado', header: 'Estado' },
          { key: 'nombreActividad', header: 'Actividad' },
          { key: 'nombreLinea', header: 'Línea' },
          { key: 'nombreDocente', header: 'Docente' },
          { key: 'cuposMaximos', header: 'Cupos máximos' },
          { key: 'cuposLlenos', header: 'Cupos llenos' },
          { key: 'cuposDisponibles', header: 'Cupos disponibles' },
          {
            key: 'dias',
            header: 'Días',
            format: (_v, row) => diasResumen(row),
          },
        ],
      });
    } catch (err) {
      showToast('danger', err?.message || 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="att-main att-main--wide att-admin-page att-gestion-page">
      <div className="att-gestion-page__toolbar">
        <div className="att-gestion-page__actions">
          <GestionPanelModeToggle />
          <GestionNav />
        </div>
      </div>
      <div className="row g-2 mb-3">
        <div className="col-6 col-md-2">
          <SearchableSelect
            value={tipo}
            onChange={(v) => {
              setTipo(v);
              setSelectedId(null);
            }}
            options={tiposOptions}
            allowClear={false}
          />
        </div>
        <div className="col-6 col-md-2">
          <SearchableSelect
            value={sedeFiltro}
            onChange={setSedeFiltro}
            options={SEDES_CURSO}
            placeholder="Sede…"
          />
        </div>
        <div className="col-6 col-md-2">
          <SearchableSelect
            value={estadoFiltro}
            onChange={setEstadoFiltro}
            options={ESTADOS_CURSO}
            placeholder="Estado…"
          />
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <SearchableSelect
            value={actividadFiltro}
            onChange={setActividadFiltro}
            options={actividadOptions}
            placeholder="Actividad…"
          />
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <input
            className="form-control form-control-sm"
            placeholder="Buscar curso…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      {periodoCupos.length ? (
        <p className="small text-muted mb-2">
          Cupos llenos = participantes distintos en los meses de inscripción permitidos (
          {periodoCupos
            .map((p) => `${MESES_LABEL[String(p.mes).padStart(2, '0')] || p.mes} ${p.anio}`)
            .join(' · ')}
          ).
        </p>
      ) : null}
      {query.isError ? <div className="alert alert-danger small">{query.error?.message}</div> : null}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive att-admin-table-wrap--mobile-safe">
          <table className="table table-sm table-hover mb-0 att-admin-table att-gestion-table att-cursos-table">
            <thead className="att-sortable-head">
              <tr>
                <SortableTh
                  label="ID"
                  column="id"
                  sort={sort.sort}
                  dir={sort.dir}
                  onSort={(column) => setSort((current) => toggleColumnSort(current, column))}
                />
                <SortableTh
                  label="Nombre"
                  column="nombre"
                  sort={sort.sort}
                  dir={sort.dir}
                  onSort={(column) => setSort((current) => toggleColumnSort(current, column))}
                />
                <SortableTh
                  label="Sede"
                  column="sede"
                  sort={sort.sort}
                  dir={sort.dir}
                  onSort={(column) => setSort((current) => toggleColumnSort(current, column))}
                />
                <SortableTh
                  label="Tarifa"
                  column="tarifa"
                  sort={sort.sort}
                  dir={sort.dir}
                  onSort={(column) => setSort((current) => toggleColumnSort(current, column))}
                />
                <SortableTh
                  label="Cupos"
                  column="cupos"
                  sort={sort.sort}
                  dir={sort.dir}
                  onSort={(column) => setSort((current) => toggleColumnSort(current, column))}
                />
                <SortableTh
                  label="Estado"
                  column="estado"
                  sort={sort.sort}
                  dir={sort.dir}
                  onSort={(column) => setSort((current) => toggleColumnSort(current, column))}
                />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.isPending ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </td>
                </tr>
              ) : null}
              {!query.isPending && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">Sin cursos</td>
                </tr>
              ) : null}
              {rows.map((c) => {
                const max =
                  c.cuposMaximos != null && String(c.cuposMaximos).trim() !== ''
                    ? Number(c.cuposMaximos)
                    : null;
                return (
                  <tr
                    key={c.id}
                    className={`att-curso-row ${selectedId === c.id ? 'is-selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td data-label="ID">{c.id}</td>
                    <td data-label="Nombre">{c.nombre}</td>
                    <td data-label="Sede">{c.sede || '—'}</td>
                    <td data-label="Tarifa">{formatCurrencyCop(c.tarifa)}</td>
                    <td data-label="Cupos">
                      <span className="att-cupos-pill">
                        {c.cuposLlenos ?? 0}
                        {max != null ? ` / ${max}` : ''}
                      </span>
                    </td>
                    <td data-label="Estado">{c.estado || '—'}</td>
                    <td data-label="" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <button
                          type="button"
                          className="btn btn-link btn-sm"
                          title="Editar"
                          onClick={() => {
                            setSelectedId(null);
                            setEditing(c);
                          }}
                        >
                          <IconPencil />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <GestionPanel
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        eyebrow="Curso"
        title={selected?.nombre || 'Detalle'}
        subtitle={selected ? `ID ${selected.id}` : null}
        width={520}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedId(null)}>
              Cerrar
            </button>
            {canEdit && selected ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditing(selected);
                  setSelectedId(null);
                }}
              >
                Editar
              </button>
            ) : null}
          </>
        }
      >
        {selected ? (
          <>
            <DrawerSection title="Cupos">
              <DrawerField label="Máximos">{selected.cuposMaximos || '—'}</DrawerField>
              <DrawerField label="Mínimos">{selected.cuposMinimos || '—'}</DrawerField>
              <DrawerField label="Llenos (mes act. + sig.)">{selected.cuposLlenos ?? 0}</DrawerField>
              <DrawerField label="Disponibles">
                {selected.cuposDisponibles != null ? selected.cuposDisponibles : '—'}
              </DrawerField>
            </DrawerSection>
            <DrawerSection title="Operación">
              <DrawerField label="Sede">{selected.sede || '—'}</DrawerField>
              <DrawerField label="Estado">{selected.estado || '—'}</DrawerField>
              <DrawerField label="Tarifa">{formatCurrencyCop(selected.tarifa)}</DrawerField>
              <DrawerField label="Código facturación">{selected.codigoFacturacion || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Clasificación">
              <DrawerField label="Actividad">{selected.nombreActividad || selected.actividad || '—'}</DrawerField>
              <DrawerField label="Línea">{selected.nombreLinea || selected.linea || '—'}</DrawerField>
              <DrawerField label="Docente">{selected.nombreDocente || selected.docente || '—'}</DrawerField>
              <DrawerField label="Nombre corto">{selected.nombreCorto || '—'}</DrawerField>
            </DrawerSection>
            <DrawerSection title="Horario">
              <DrawerField label="Días">{diasResumen(selected)}</DrawerField>
              <DrawerField label="Fecha inicio">{formatFechaCorta(selected.fechaInicio)}</DrawerField>
              <DrawerField label="Fecha final">{formatFechaCorta(selected.fechaFinal)}</DrawerField>
            </DrawerSection>
            {selected.descripcion ? (
              <DrawerSection title="Descripción">
                <DrawerField label="Detalle">{selected.descripcion}</DrawerField>
              </DrawerSection>
            ) : null}
          </>
        ) : null}
      </GestionPanel>

      <CursoFormModal
        key={editing?.id || (creating ? 'new-curso' : 'closed')}
        open={creating || Boolean(editing)}
        editing={editing}
        tipoDefault={tipo}
        tiposOptions={tiposOptions}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(form) => saveMut.mutate(form)}
        isPending={saveMut.isPending}
        error={saveMut.error?.message}
      />

      <GestionFab
        canCreate={canCreate}
        canExport
        exporting={exporting}
        exportDisabled={rows.length === 0}
        newTitle="Nuevo curso"
        onNew={() => setCreating(true)}
        onExport={exportExcel}
      />

      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}
