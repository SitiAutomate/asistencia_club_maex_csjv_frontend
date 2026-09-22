import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, patchJson, postJson, deleteJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isAdminLike, isNavKeyEnabled, isSuperAdmin } from '../../lib/navFeatures.js';
import { canGestion, useGestionPermisos } from '../../lib/useGestionPermisos.js';
import { formatFechaCorta, toDateInput } from '../../lib/formatDate.js';
import { anioMesBogotaClient, isPeriodoInscripcionPermitidoClient, periodosInscripcionPermitidosClient, fechaHoyBogotaClient } from '../../lib/gestionHelpers.js';
import { loadGestionFilters, saveGestionFilters } from '../../lib/gestionFiltersStorage.js';
import {
  DEFAULT_INSCRIPCIONES_COL_WIDTHS,
  loadColWidths,
  saveColWidths,
  startColumnResize,
} from '../../lib/gestionColWidths.js';
import {
  formatCurrencyCop,
  MESES_LABEL,
} from '../../lib/gestionFormat.js';
import { GestionNav } from '../../components/gestion/GestionNav.jsx';
import { GestionFab } from '../../components/gestion/GestionFab.jsx';
import { SortableTh, toggleColumnSort } from '../../components/gestion/SortableTh.jsx';
import { SearchableSelect } from '../../components/gestion/SearchableSelect.jsx';
import { MultiSearchableSelect } from '../../components/gestion/MultiSearchableSelect.jsx';
import { GestionPanel, GestionPanelModeToggle } from '../../components/gestion/GestionPanel.jsx';
import { DrawerSection, SlideDrawer } from '../../components/gestion/SlideDrawer.jsx';
import { GestionSearchInput } from '../../components/gestion/GestionSearchInput.jsx';
import { IconCopy, IconEye, IconFilters, IconMonthPass, IconPencil, IconTrash } from '../../components/gestion/GestionIcons.jsx';
import { AttToast, useAttToast } from '../../components/AttToast.jsx';

/** Evita disparar la lista en cada tecla del buscador. */
function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const ESTADOS_EDIT = ['CONFIRMADO', 'ACTIVO', 'INCAPACITADO', 'RETIRADO'];
const SEDES = ['MEDELLÍN', 'RETIRO'];
const MESES_SHORT = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
};

function asFilterArray(value) {
  if (Array.isArray(value)) return value.map(String).filter((v) => v && v !== 'TODOS');
  if (value == null || value === '' || value === 'TODOS') return [];
  return [String(value)];
}

function joinFilterParam(values) {
  const list = asFilterArray(values);
  return list.length ? list.join(',') : '';
}

function foldSede(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
const TRANSPORTE_OPTS = [
  { value: 'SI', label: 'Si' },
  { value: 'NO', label: 'No' },
];

function displayCampoExtra(c) {
  if (!c) return '—';
  const v = c.displayValue ?? c.valueLabel ?? c.value;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
}

function isObservacionColumna(columnaDb) {
  const c = String(columnaDb || '').trim();
  return c === 'OBSERVACION' || c.toLowerCase() === 'observacion';
}

function isObsFacturacionColumna(columnaDb) {
  const c = String(columnaDb || '').trim();
  return c === 'Observacion_Facturacion' || c.toLowerCase() === 'observacion_facturacion';
}

function emptyForm(tipoFijo) {
  const { anio, mes } = anioMesBogotaClient();
  return {
    tipo: tipoFijo ?? '',
    idCurso: '',
    documentoParticipante: '',
    documentoResponsable: '',
    mes,
    anio: String(anio),
    sede: '',
    transporte: 'NO',
    estado: 'ACTIVO',
    observaciones: '',
    observacionFacturacion: '',
    causalRetiro: '',
    fechaIngresoNuevoTransporte: '',
    fechaRetiro: '',
    fechaRetiroTransporte: '',
    camposExtra: {},
  };
}

function buildAnioOptions(metaAnios, currentAnio) {
  const set = new Set();
  (metaAnios || []).forEach((r) => {
    if (r?.anio) set.add(String(r.anio));
  });
  const base = Number(currentAnio) || anioMesBogotaClient().anio;
  for (let y = base - 3; y <= base + 1; y += 1) set.add(String(y));
  return [...set]
    .sort((a, b) => Number(b) - Number(a))
    .map((y) => ({ value: y, label: y }));
}

function DetailField({ label, children }) {
  return (
    <div className="att-detail-item">
      <span className="att-detail-item__label">{label}</span>
      <span className="att-detail-item__value">{children ?? '—'}</span>
    </div>
  );
}

function fichaVal(value) {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}

function FichaModal({ kind, documento, onClose }) {
  const path =
    kind === 'participante'
      ? `/api/gestion/participantes/${encodeURIComponent(documento || '')}`
      : `/api/gestion/responsables/${encodeURIComponent(documento || '')}`;

  const query = useQuery({
    queryKey: ['gestion-ficha', kind, documento],
    queryFn: () => getJson(path),
    enabled: Boolean(documento),
  });

  const data = kind === 'participante' ? query.data?.participante : query.data?.responsable;
  const isPart = kind === 'participante';

  return (
    <GestionPanel
      open={Boolean(documento)}
      onClose={onClose}
      eyebrow="Ficha"
      title={
        data?.nombreCompleto ||
        (query.isPending ? 'Cargando…' : isPart ? 'Participante' : 'Responsable')
      }
      subtitle={data?.documento || documento || undefined}
      width={560}
      size="lg"
      className="att-ficha-modal"
    >
      {query.isPending ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" />
        </div>
      ) : null}
      {query.isError ? <div className="alert alert-danger small">{query.error?.message}</div> : null}
      {data && isPart ? (
        <div className="att-detail-sections att-ficha">
          <section className="att-detail-section">
            <h6 className="att-detail-section__title">Identificación</h6>
            <div className="att-detail-grid">
              <DetailField label="Documento">{fichaVal(data.documento)}</DetailField>
              <DetailField label="Tipo documento">{fichaVal(data.tipoDocumento)}</DetailField>
              <DetailField label="Interno / externo">{fichaVal(data.internoExterno)}</DetailField>
              <DetailField label="Grupo">{fichaVal(data.grupo)}</DetailField>
              <DetailField label="Nacimiento">{formatFechaCorta(data.fechaNacimiento)}</DetailField>
            </div>
          </section>
          <section className="att-detail-section">
            <h6 className="att-detail-section__title">Nombre</h6>
            <div className="att-detail-grid">
              <DetailField label="Primer nombre">{fichaVal(data.primerNombre)}</DetailField>
              <DetailField label="Segundo nombre">{fichaVal(data.segundoNombre)}</DetailField>
              <DetailField label="Primer apellido">{fichaVal(data.primerApellido)}</DetailField>
              <DetailField label="Segundo apellido">{fichaVal(data.segundoApellido)}</DetailField>
              <DetailField label="Nombre completo">{fichaVal(data.nombreCompleto)}</DetailField>
            </div>
          </section>
          <section className="att-detail-section">
            <h6 className="att-detail-section__title">Responsable</h6>
            <div className="att-detail-grid">
              <DetailField label="Documento">{fichaVal(data.idResponsable)}</DetailField>
              <DetailField label="Nombre">{fichaVal(data.nombreResponsable)}</DetailField>
              <DetailField label="Celular">{fichaVal(data.celularResponsable)}</DetailField>
              <DetailField label="Correo">{fichaVal(data.correoResponsable)}</DetailField>
            </div>
          </section>
          <div className="att-detail-split">
            <section className="att-detail-section">
              <h6 className="att-detail-section__title">Padre</h6>
              <div className="att-detail-grid att-detail-grid--compact">
                <DetailField label="Documento">{fichaVal(data.documentoPadre)}</DetailField>
                <DetailField label="Nombre">{fichaVal(data.nombrePadre)}</DetailField>
                <DetailField label="Celular">{fichaVal(data.celularPadre)}</DetailField>
                <DetailField label="Correo">{fichaVal(data.emailPadre)}</DetailField>
              </div>
            </section>
            <section className="att-detail-section">
              <h6 className="att-detail-section__title">Madre</h6>
              <div className="att-detail-grid att-detail-grid--compact">
                <DetailField label="Documento">{fichaVal(data.documentoMadre)}</DetailField>
                <DetailField label="Nombre">{fichaVal(data.nombreMadre)}</DetailField>
                <DetailField label="Celular">{fichaVal(data.celularMadre)}</DetailField>
                <DetailField label="Correo">{fichaVal(data.emailMadre)}</DetailField>
              </div>
            </section>
          </div>
        </div>
      ) : null}
      {data && !isPart ? (
        <div className="att-detail-sections att-ficha">
          <section className="att-detail-section">
            <h6 className="att-detail-section__title">Identificación</h6>
            <div className="att-detail-grid">
              <DetailField label="Documento">{fichaVal(data.documento)}</DetailField>
              <DetailField label="Tipo identificación">{fichaVal(data.tipoIdentificacion)}</DetailField>
              <DetailField label="Tipo persona">{fichaVal(data.tipoPersona)}</DetailField>
            </div>
          </section>
          <section className="att-detail-section">
            <h6 className="att-detail-section__title">Contacto</h6>
            <div className="att-detail-grid">
              <DetailField label="Nombre completo">{fichaVal(data.nombreCompleto)}</DetailField>
              <DetailField label="Nombres">{fichaVal(data.nombres)}</DetailField>
              <DetailField label="Apellidos">{fichaVal(data.apellidos)}</DetailField>
              <DetailField label="Celular">{fichaVal(data.celular)}</DetailField>
              <DetailField label="Correo">{fichaVal(data.correo)}</DetailField>
              <DetailField label="Departamento">
                {fichaVal(data.nombreDepartamento || data.departamento)}
              </DetailField>
              <DetailField label="Ciudad">{fichaVal(data.nombreCiudad || data.ciudad)}</DetailField>
              <DetailField label="Dirección">{fichaVal(data.direccion)}</DetailField>
            </div>
          </section>
        </div>
      ) : null}
    </GestionPanel>
  );
}

function useEntityOptions(kind, enabled, selectedValue, selectedLabel) {
  const [q, setQ] = useState('');
  const path =
    kind === 'participantes'
      ? `/api/gestion/participantes?limit=80&q=${encodeURIComponent(q)}`
      : `/api/gestion/responsables?limit=80&q=${encodeURIComponent(q)}`;

  const query = useQuery({
    queryKey: ['gestion-entity-opts', kind, q],
    queryFn: () => getJson(path),
    enabled,
    staleTime: 20_000,
  });

  const options = useMemo(() => {
    const rows =
      kind === 'participantes'
        ? query.data?.participantes || []
        : query.data?.responsables || [];
    const mapped = rows.map((r) => ({
      value: r.documento,
      label: `${r.nombreCompleto || 'Sin nombre'} (${r.documento})`,
      searchText: `${r.nombreCompleto} ${r.documento} ${r.correo || ''} ${r.celular || ''}`,
      idResponsable: r.idResponsable || '',
      nombreResponsable: r.nombreResponsable || '',
    }));
    if (
      selectedValue &&
      !mapped.some((o) => String(o.value) === String(selectedValue))
    ) {
      mapped.unshift({
        value: selectedValue,
        label: selectedLabel
          ? `${selectedLabel} (${selectedValue})`
          : String(selectedValue),
        idResponsable: '',
        nombreResponsable: '',
      });
    }
    return mapped;
  }, [query.data, kind, selectedValue, selectedLabel]);

  return { options, setQ, isPending: query.isPending };
}

function useCausalesOptions(enabled) {
  const query = useQuery({
    queryKey: ['gestion-causales', 'v3'],
    queryFn: () => getJson('/api/gestion/causales'),
    enabled,
    staleTime: 5 * 60_000,
  });
  return useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const c of query.data?.causales || []) {
      const label = String(c || '').trim();
      if (!label) continue;
      const key = label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(de|del|la|el|los|las|un|una|al|a)\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ value: label, label });
    }
    return out;
  }, [query.data]);
}

function InscripcionFormModal({
  open,
  initial,
  tipoFijo,
  tiposOptions,
  anioOptions,
  title,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => emptyForm(tipoFijo));
  const [formError, setFormError] = useState('');
  const tipo = Number(tipoFijo ?? form.tipo);
  const isRetirado = String(form.estado || '').toUpperCase() === 'RETIRADO';
  const causalesOptions = useCausalesOptions(open);

  useEffect(() => {
    if (!open) return;
    setFormError('');
    if (initial) {
      const extras = {};
      (initial.camposExtra || []).forEach((c) => {
        if (c?.campoKey) extras[c.campoKey] = c.value ?? '';
      });
      setForm({
        ...emptyForm(tipoFijo ?? initial.tipo),
        tipo: initial.tipo ?? tipoFijo ?? '',
        idCurso: initial.idCurso || '',
        documentoParticipante: initial.documentoParticipante || '',
        documentoResponsable: initial.documentoResponsable || '',
        mes: String(initial.mes || '').padStart(2, '0'),
        anio: String(initial.año || initial.anio || anioMesBogotaClient().anio),
        sede: initial.sede || 'MEDELLÍN',
        transporte: String(initial.transporte || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO',
        estado: String(initial.estado || 'ACTIVO').toUpperCase(),
        observaciones: initial.observaciones || '',
        observacionFacturacion: initial.observacionFacturacion || '',
        causalRetiro: initial.causalRetiro || '',
        fechaIngresoNuevoTransporte: toDateInput(initial.fechaIngresoNuevoTransporte),
        fechaRetiro:
          toDateInput(initial.fechaRetiro) ||
          (String(initial.estado || '').toUpperCase() === 'RETIRADO' ? fechaHoyBogotaClient() : ''),
        fechaRetiroTransporte: toDateInput(initial.fechaRetiroTransporte),
        camposExtra: extras,
      });
    } else {
      setForm(emptyForm(tipoFijo));
    }
  }, [open, initial, tipoFijo]);

  const isNueva = !initial?.id;

  const camposTipoQuery = useQuery({
    queryKey: ['gestion-tipo-campos', tipo],
    queryFn: () => getJson(`/api/gestion/config/tipo-campos?tipo=${encodeURIComponent(tipo)}`),
    enabled: open && Number.isFinite(tipo) && tipo > 1,
    staleTime: 60_000,
  });

  const detailExtrasQuery = useQuery({
    queryKey: ['gestion-inscripcion-extras', initial?.id],
    queryFn: () => getJson(`/api/gestion/inscripciones/${initial.id}`),
    enabled: open && Boolean(initial?.id) && Number.isFinite(tipo) && tipo > 1,
    staleTime: 30_000,
  });

  useEffect(() => {
    const list = detailExtrasQuery.data?.inscripcion?.camposExtra;
    if (!list?.length) return;
    setForm((prev) => {
      const next = { ...(prev.camposExtra || {}) };
      list.forEach((c) => {
        if (c?.campoKey) next[c.campoKey] = c.value ?? '';
      });
      return { ...prev, camposExtra: next };
    });
  }, [detailExtrasQuery.data]);

  const camposForm = useMemo(
    () => (camposTipoQuery.data?.campos || []).filter((c) => c.visibleForm !== false),
    [camposTipoQuery.data],
  );

  /** Sincroniza OBSERVACION / facturación del formulario base → camposExtra configurados. */
  useEffect(() => {
    if (!camposForm.length) return;
    setForm((prev) => {
      const next = { ...(prev.camposExtra || {}) };
      let changed = false;
      for (const c of camposForm) {
        if (isObservacionColumna(c.columnaDb) && next[c.campoKey] === undefined) {
          next[c.campoKey] = prev.observaciones || '';
          changed = true;
        }
        if (isObsFacturacionColumna(c.columnaDb) && next[c.campoKey] === undefined) {
          next[c.campoKey] = prev.observacionFacturacion || '';
          changed = true;
        }
      }
      return changed ? { ...prev, camposExtra: next } : prev;
    });
  }, [camposForm]);

  const obsCampo = useMemo(
    () => camposForm.find((c) => isObservacionColumna(c.columnaDb)),
    [camposForm],
  );
  const obsFactCampo = useMemo(
    () => camposForm.find((c) => isObsFacturacionColumna(c.columnaDb)),
    [camposForm],
  );
  const showFixedObs = !obsCampo;
  const showFixedObsFact = !obsFactCampo;

  const catalogKeys = useMemo(
    () => [...new Set(camposForm.map((c) => c.catalogo).filter(Boolean))],
    [camposForm],
  );

  const catalogQueries = useQuery({
    queryKey: ['gestion-catalogos-form', catalogKeys.join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        catalogKeys.map(async (key) => {
          const data = await getJson(`/api/gestion/config/catalogos/${encodeURIComponent(key)}`);
          return [key, data?.opciones || []];
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: open && catalogKeys.length > 0,
    staleTime: 60_000,
  });

  const cursosQuery = useQuery({
    queryKey: ['gestion-cursos', tipo],
    queryFn: () => getJson(`/api/gestion/cursos?tipo=${encodeURIComponent(tipo)}`),
    enabled: open && Number.isFinite(tipo) && tipo > 0 && Boolean(form.sede),
    staleTime: 60_000,
  });

  const partOpts = useEntityOptions(
    'participantes',
    open,
    form.documentoParticipante,
    initial?.nombreParticipante,
  );
  const selectedPart = useMemo(
    () =>
      partOpts.options.find(
        (o) => String(o.value) === String(form.documentoParticipante || ''),
      ),
    [partOpts.options, form.documentoParticipante],
  );
  const respOpts = useEntityOptions(
    'responsables',
    open,
    form.documentoResponsable,
    initial?.responsable?.nombreCompleto || selectedPart?.nombreResponsable,
  );

  const cursoOptions = useMemo(() => {
    const sedeFold = foldSede(form.sede);
    return (cursosQuery.data?.cursos || [])
      .filter((c) => !sedeFold || foldSede(c.sede) === sedeFold)
      .map((c) => ({
        value: c.id,
        label: `${c.nombre} (${c.id})`,
        searchText: `${c.nombre} ${c.nombreCorto || ''} ${c.id}`,
      }));
  }, [cursosQuery.data, form.sede]);

  const mesFormOptions = useMemo(() => {
    if (!isNueva) {
      return Object.entries(MESES_LABEL).map(([v, l]) => ({ value: v, label: l }));
    }
    const allowed = periodosInscripcionPermitidosClient();
    const meses = [...new Set(allowed.map((p) => p.mes))];
    return meses.map((v) => ({ value: v, label: MESES_LABEL[v] || v }));
  }, [isNueva]);

  const anioFormOptions = useMemo(() => {
    if (!isNueva) return anioOptions;
    const allowed = periodosInscripcionPermitidosClient();
    const years = [...new Set(allowed.map((p) => String(p.anio)))];
    return years.map((y) => ({ value: y, label: y }));
  }, [isNueva, anioOptions]);

  const estadoFormOptions = useMemo(
    () => ESTADOS_EDIT.map((e) => ({ value: e, label: e })),
    [],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const estado = String(form.estado || '').toUpperCase();
      if (estado === 'RETIRADO') {
        if (!form.causalRetiro) throw new Error('Seleccione la causal de retiro');
        if (!form.fechaRetiro) throw new Error('La fecha de retiro es obligatoria');
      }
      if (isNueva && !isPeriodoInscripcionPermitidoClient(form.anio, form.mes)) {
        throw new Error(
          'Solo se pueden crear inscripciones para el mes actual o el siguiente',
        );
      }
      const extras = { ...(form.camposExtra || {}) };
      let observaciones = form.observaciones;
      let observacionFacturacion = form.observacionFacturacion;
      if (obsCampo && Object.prototype.hasOwnProperty.call(extras, obsCampo.campoKey)) {
        observaciones = extras[obsCampo.campoKey] ?? '';
      }
      if (obsFactCampo && Object.prototype.hasOwnProperty.call(extras, obsFactCampo.campoKey)) {
        observacionFacturacion = extras[obsFactCampo.campoKey] ?? '';
      }
      const payload = {
        tipo,
        idCurso: form.idCurso,
        documentoParticipante: form.documentoParticipante,
        documentoResponsable: form.documentoResponsable,
        mes: form.mes,
        anio: Number(form.anio),
        sede: form.sede,
        transporte: form.transporte === 'SI' ? 'SI' : 'NO',
        estado,
        observaciones,
        observacionFacturacion,
        causalRetiro: estado === 'RETIRADO' ? form.causalRetiro : null,
        fechaIngresoNuevoTransporte: toDateInput(form.fechaIngresoNuevoTransporte) || null,
        fechaRetiro: estado === 'RETIRADO' ? toDateInput(form.fechaRetiro) || null : null,
        fechaRetiroTransporte: toDateInput(form.fechaRetiroTransporte) || null,
        ...(tipo > 1 ? { camposExtra: extras } : {}),
      };
      if (initial?.id) return patchJson(`/api/gestion/inscripciones/${initial.id}`, payload);
      return postJson('/api/gestion/inscripciones', payload);
    },
    onSuccess: () => {
      onSaved?.(initial?.id ? 'Inscripción actualizada' : 'Inscripción creada');
      onClose?.();
    },
    onError: (err) => setFormError(err?.message || 'No se pudo guardar'),
  });

  if (!open) return null;
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const formFooter = (
    <>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={saveMut.isPending}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={saveMut.isPending}
        onClick={() => {
          setFormError('');
          saveMut.mutate();
        }}
      >
        {saveMut.isPending ? 'Guardando…' : 'Guardar'}
      </button>
    </>
  );

  return (
    <GestionPanel
      open={open}
      onClose={onClose}
      title={title}
      subtitle={
        isNueva
          ? `Solo mes actual o siguiente${
              periodosInscripcionPermitidosClient().some(
                (p) => p.mes === '01' && p.anio !== anioMesBogotaClient().anio,
              )
                ? ' (en diciembre incluye enero del año siguiente)'
                : ''
            }.`
          : undefined
      }
      width={560}
      className="att-form-modal"
      footer={formFooter}
    >
            {formError || saveMut.isError ? (
              <div className="alert alert-danger small">{formError || saveMut.error?.message}</div>
            ) : null}
            <div className="att-form-section">
              <h6 className="att-form-section__title">Curso y personas</h6>
              <div className="row g-2">
              {tipoFijo == null ? (
                <div className="col-md-4">
                  <label className="form-label small">Tipo</label>
                  <SearchableSelect
                    value={form.tipo}
                    onChange={(v) => setForm((p) => ({ ...p, tipo: v, idCurso: '' }))}
                    options={tiposOptions}
                    placeholder="Seleccione tipo…"
                    allowClear={false}
                  />
                </div>
              ) : null}
              <div className={tipoFijo == null ? 'col-md-4' : 'col-md-6'}>
                <label className="form-label small">Sede</label>
                <SearchableSelect
                  value={form.sede}
                  onChange={(v) => setForm((p) => ({ ...p, sede: v, idCurso: '' }))}
                  options={SEDES.map((s) => ({ value: s, label: s }))}
                  placeholder="Seleccione sede…"
                  allowClear={false}
                />
              </div>
              <div className={tipoFijo == null ? 'col-md-4' : 'col-md-6'}>
                <label className="form-label small">Curso</label>
                <SearchableSelect
                  value={form.idCurso}
                  onChange={(v) => setForm((p) => ({ ...p, idCurso: v }))}
                  options={cursoOptions}
                  placeholder={form.sede ? 'Buscar curso…' : 'Elija sede primero…'}
                  allowClear={false}
                  disabled={!form.sede}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Participante</label>
                <SearchableSelect
                  value={form.documentoParticipante}
                  onChange={(v, opt) => {
                    const idResp = opt?.idResponsable || '';
                    setForm((p) => ({
                      ...p,
                      documentoParticipante: v,
                      ...(idResp ? { documentoResponsable: idResp } : {}),
                    }));
                  }}
                  options={partOpts.options}
                  placeholder="Buscar participante…"
                  allowClear={false}
                  onSearchChange={partOpts.setQ}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Responsable</label>
                <SearchableSelect
                  value={form.documentoResponsable}
                  onChange={(v) => setForm((p) => ({ ...p, documentoResponsable: v }))}
                  options={respOpts.options}
                  placeholder="Buscar responsable…"
                  allowClear={false}
                  onSearchChange={respOpts.setQ}
                />
              </div>
              </div>
            </div>

            <div className="att-form-section">
              <h6 className="att-form-section__title">Periodo y estado</h6>
              <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Mes</label>
                <SearchableSelect
                  value={form.mes}
                  onChange={(v) => {
                    const allowed = periodosInscripcionPermitidosClient();
                    const match = allowed.find((p) => p.mes === v);
                    setForm((p) => ({
                      ...p,
                      mes: v,
                      ...(isNueva && match ? { anio: String(match.anio) } : {}),
                    }));
                  }}
                  options={mesFormOptions}
                  allowClear={false}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Año</label>
                <SearchableSelect
                  value={form.anio}
                  onChange={(v) => setForm((p) => ({ ...p, anio: v }))}
                  options={anioFormOptions}
                  allowClear={false}
                  disabled={isNueva && anioFormOptions.length <= 1}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Estado</label>
                <SearchableSelect
                  value={form.estado}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      estado: v,
                      ...(String(v).toUpperCase() !== 'RETIRADO'
                        ? { causalRetiro: '', fechaRetiro: '' }
                        : {
                            fechaRetiro: p.fechaRetiro || fechaHoyBogotaClient(),
                          }),
                    }))
                  }
                  options={estadoFormOptions}
                  allowClear={false}
                />
              </div>
              </div>
            </div>

            <div className="att-form-section">
              <h6 className="att-form-section__title">Transporte</h6>
              <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Transporte</label>
                <SearchableSelect
                  value={form.transporte}
                  onChange={(v) => setForm((p) => ({ ...p, transporte: v }))}
                  options={TRANSPORTE_OPTS}
                  allowClear={false}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Fecha ingreso transporte</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={form.fechaIngresoNuevoTransporte}
                  onChange={set('fechaIngresoNuevoTransporte')}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Fecha retiro transporte</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={form.fechaRetiroTransporte}
                  onChange={set('fechaRetiroTransporte')}
                />
              </div>
              </div>
            </div>

              {isRetirado ? (
            <div className="att-form-section">
              <h6 className="att-form-section__title">Retiro</h6>
              <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small">Causal de retiro *</label>
                    <SearchableSelect
                      value={form.causalRetiro}
                      onChange={(v) => setForm((p) => ({ ...p, causalRetiro: v }))}
                      options={causalesOptions}
                      placeholder="Seleccione causal…"
                      allowClear={false}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Fecha de retiro *</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.fechaRetiro}
                      onChange={set('fechaRetiro')}
                      required
                    />
                  </div>
              </div>
            </div>
              ) : null}

            {camposForm.length > 0 ? (
              <div className="att-form-section">
                <h6 className="att-form-section__title">Campos del tipo</h6>
                <div className="row g-2">
                  {camposForm.map((c) => {
                    const val = form.camposExtra?.[c.campoKey] ?? '';
                    const setExtra = (value) =>
                      setForm((p) => {
                        const patch = {
                          ...p,
                          camposExtra: { ...(p.camposExtra || {}), [c.campoKey]: value },
                        };
                        if (isObservacionColumna(c.columnaDb)) patch.observaciones = value;
                        if (isObsFacturacionColumna(c.columnaDb)) patch.observacionFacturacion = value;
                        return patch;
                      });
                    if (c.catalogo || c.tipoInput === 'relation' || c.tipoInput === 'select') {
                      const opts = (catalogQueries.data?.[c.catalogo] || []).map((o) => ({
                        value: String(o.value),
                        label: o.label,
                      }));
                      return (
                        <div key={c.campoKey} className="col-md-6">
                          <label className="form-label small">
                            {c.label}
                            {c.requerido ? ' *' : ''}
                          </label>
                          <SearchableSelect
                            value={val == null ? '' : String(val)}
                            onChange={(v) => setExtra(v)}
                            options={opts}
                            placeholder={`Seleccione ${c.label.toLowerCase()}…`}
                            allowClear={!c.requerido}
                          />
                        </div>
                      );
                    }
                    if (c.tipoInput === 'textarea' || isObservacionColumna(c.columnaDb) || isObsFacturacionColumna(c.columnaDb)) {
                      return (
                        <div key={c.campoKey} className="col-12">
                          <label className="form-label small">
                            {c.label}
                            {c.requerido ? ' *' : ''}
                          </label>
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            value={val}
                            required={Boolean(c.requerido)}
                            onChange={(e) => setExtra(e.target.value)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={c.campoKey} className="col-md-6">
                        <label className="form-label small">
                          {c.label}
                          {c.requerido ? ' *' : ''}
                        </label>
                        <input
                          type={c.tipoInput === 'number' ? 'number' : c.tipoInput === 'date' ? 'date' : 'text'}
                          className="form-control form-control-sm"
                          value={c.tipoInput === 'date' ? String(val || '').slice(0, 10) : val}
                          required={Boolean(c.requerido)}
                          onChange={(e) => setExtra(e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showFixedObs || showFixedObsFact ? (
            <div className="att-form-section">
              <h6 className="att-form-section__title">Observaciones</h6>
              <div className="row g-2">
              {showFixedObs ? (
              <div className="col-12">
                <label className="form-label small">Observaciones</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.observaciones} onChange={set('observaciones')} />
              </div>
              ) : null}
              {showFixedObsFact ? (
              <div className="col-12">
                <label className="form-label small">Observación de facturación</label>
                <textarea className="form-control form-control-sm" rows={2} value={form.observacionFacturacion} onChange={set('observacionFacturacion')} />
              </div>
              ) : null}
              </div>
            </div>
            ) : null}
    </GestionPanel>
  );
}

function DuplicarInscripcionModal({ source, anioOptions, onClose, onSaved }) {
  const now = anioMesBogotaClient();
  const [mes, setMes] = useState(now.mes);
  const [anio, setAnio] = useState(String(now.anio));
  const [estado, setEstado] = useState('ACTIVO');
  const [causalRetiro, setCausalRetiro] = useState('');
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [error, setError] = useState('');
  const isRetirado = estado === 'RETIRADO';
  const causalesOptions = useCausalesOptions(Boolean(source));

  const mesOptions = useMemo(() => {
    const allowed = periodosInscripcionPermitidosClient();
    return [...new Set(allowed.map((p) => p.mes))].map((v) => ({
      value: v,
      label: MESES_LABEL[v] || v,
    }));
  }, []);

  const anioDupOptions = useMemo(() => {
    const allowed = periodosInscripcionPermitidosClient();
    return [...new Set(allowed.map((p) => String(p.anio)))].map((y) => ({
      value: y,
      label: y,
    }));
  }, []);

  const mut = useMutation({
    mutationFn: async () => {
      if (isRetirado) {
        if (!causalRetiro) throw new Error('Seleccione la causal de retiro');
        if (!fechaRetiro) throw new Error('La fecha de retiro es obligatoria');
      }
      if (!isPeriodoInscripcionPermitidoClient(anio, mes)) {
        throw new Error('Solo se pueden crear inscripciones para el mes actual o el siguiente');
      }
      return postJson('/api/gestion/inscripciones', {
        tipo: source.tipo,
        idCurso: source.idCurso,
        documentoParticipante: source.documentoParticipante,
        documentoResponsable: source.documentoResponsable,
        mes,
        anio: Number(anio),
        sede: source.sede,
        transporte: String(source.transporte || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO',
        estado,
        observaciones: source.observaciones || '',
        observacionFacturacion: source.observacionFacturacion || '',
        causalRetiro: isRetirado ? causalRetiro : null,
        fechaIngresoNuevoTransporte: toDateInput(source.fechaIngresoNuevoTransporte) || null,
        fechaRetiro: isRetirado ? toDateInput(fechaRetiro) || null : null,
        fechaRetiroTransporte: toDateInput(source.fechaRetiroTransporte) || null,
      });
    },
    onSuccess: () => {
      onSaved?.('Inscripción duplicada');
      onClose?.();
    },
    onError: (err) => setError(err?.message || 'No se pudo duplicar'),
  });

  if (!source) return null;

  return (
    <GestionPanel
      open
      onClose={onClose}
      title="Duplicar inscripción"
      width={440}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={mut.isPending}
            onClick={() => {
              setError('');
              mut.mutate();
            }}
          >
            {mut.isPending ? 'Duplicando…' : 'Duplicar'}
          </button>
        </>
      }
    >
      <p className="small text-muted mb-3">
        Se copiará <strong>{source.nombreParticipante || source.documentoParticipante}</strong>
        {' · '}
        <strong>{source.nombreCurso || source.idCurso}</strong>
      </p>
      {error ? <div className="alert alert-danger small">{error}</div> : null}
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small">Mes</label>
          <SearchableSelect
            value={mes}
            onChange={(v) => {
              setMes(v);
              const match = periodosInscripcionPermitidosClient().find((p) => p.mes === v);
              if (match) setAnio(String(match.anio));
            }}
            options={mesOptions}
            allowClear={false}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Año</label>
          <SearchableSelect
            value={anio}
            onChange={setAnio}
            options={anioDupOptions}
            allowClear={false}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Estado</label>
          <SearchableSelect
            value={estado}
            onChange={(v) => {
              setEstado(v);
              if (v !== 'RETIRADO') {
                setCausalRetiro('');
                setFechaRetiro('');
              }
            }}
            options={ESTADOS_EDIT.map((e) => ({ value: e, label: e }))}
            allowClear={false}
          />
        </div>
        {isRetirado ? (
          <>
            <div className="col-md-6">
              <label className="form-label small">Causal de retiro *</label>
              <SearchableSelect
                value={causalRetiro}
                onChange={setCausalRetiro}
                options={causalesOptions}
                placeholder="Seleccione causal…"
                allowClear={false}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small">Fecha de retiro *</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fechaRetiro}
                onChange={(e) => setFechaRetiro(e.target.value)}
              />
            </div>
          </>
        ) : null}
      </div>
    </GestionPanel>
  );
}

function RetirarModal({ row, onClose, onSaved }) {
  const [causal, setCausal] = useState('');
  const [fechaRetiro, setFechaRetiro] = useState(() => fechaHoyBogotaClient());
  const [error, setError] = useState('');
  const causalesOptions = useCausalesOptions(Boolean(row));

  const mut = useMutation({
    mutationFn: () => {
      if (!causal) throw new Error('Seleccione la causal de retiro');
      const fecha = toDateInput(fechaRetiro);
      if (!fecha) throw new Error('La fecha de retiro es obligatoria');
      return patchJson(`/api/gestion/inscripciones/${row.id}`, {
        estado: 'RETIRADO',
        causalRetiro: causal,
        fechaRetiro: fecha,
      });
    },
    onSuccess: () => {
      onSaved?.('Inscripción retirada');
      onClose?.();
    },
    onError: (err) => setError(err?.message || 'No se pudo retirar'),
  });

  if (!row) return null;

  return (
    <GestionPanel
      open
      onClose={onClose}
      title="Retirar inscripción"
      width={420}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={mut.isPending}
            onClick={() => {
              setError('');
              mut.mutate();
            }}
          >
            {mut.isPending ? 'Retirando…' : 'Confirmar retiro'}
          </button>
        </>
      }
    >
      <p className="small text-muted mb-3">
        {row.nombreParticipante || row.documentoParticipante} · {row.nombreCurso || row.idCurso}
      </p>
      {error ? <div className="alert alert-danger small">{error}</div> : null}
      <div className="mb-2">
        <label className="form-label small">Causal de retiro *</label>
        <SearchableSelect
          value={causal}
          onChange={setCausal}
          options={causalesOptions}
          placeholder="Seleccione causal…"
          allowClear={false}
        />
      </div>
      <div>
        <label className="form-label small">Fecha de retiro *</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={fechaRetiro}
          onChange={(e) => setFechaRetiro(e.target.value)}
        />
      </div>
    </GestionPanel>
  );
}

function DetailModal({ id, onClose, onEdit, onDelete, onOpenFicha, canEdit = true, canDelete = false }) {
  const query = useQuery({
    queryKey: ['gestion-detalle', id],
    queryFn: () => getJson(`/api/gestion/inscripciones/${id}`),
    enabled: Boolean(id),
  });
  const row = query.data?.inscripcion;
  const estado = String(row?.estado || '').toUpperCase();
  const transporteSi = String(row?.transporte || '').toUpperCase() === 'SI';
  const mesLabel = row ? MESES_LABEL[String(row.mes).padStart(2, '0')] || row.mes : '';

  const estadoClass =
    estado === 'ACTIVO' || estado === 'CONFIRMADO'
      ? 'att-detail-badge--ok'
      : estado === 'RETIRADO'
        ? 'att-detail-badge--danger'
        : estado === 'INCAPACITADO'
          ? 'att-detail-badge--warn'
          : 'att-detail-badge--muted';

  const detailFooter = (
    <>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
        Cerrar
      </button>
      {row && canDelete ? (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete?.(row)}>
          Eliminar
        </button>
      ) : null}
      {row && canEdit ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onEdit(row)}>
          Editar
        </button>
      ) : null}
    </>
  );

  return (
    <GestionPanel
      open={Boolean(id)}
      onClose={onClose}
      eyebrow="Detalle de inscripción"
      title={row?.nombreParticipante || (query.isPending ? 'Cargando…' : 'Inscripción')}
      subtitle={
        row
          ? `${row.documentoParticipante || ''}${row.nombreCurso || row.idCurso ? ` · ${row.nombreCurso || row.idCurso}` : ''}${
              row.año ? ` · ${mesLabel} ${row.año}` : ''
            }`
          : undefined
      }
      width={560}
      size="xl"
      className="att-detail-modal"
      footer={detailFooter}
    >
      {row ? <span className={`att-detail-badge ${estadoClass} mb-3 d-inline-flex`}>{row.estado || '—'}</span> : null}

          {query.isPending ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" />
              </div>
            ) : null}
            {query.isError ? <div className="alert alert-danger small mb-0">{query.error?.message}</div> : null}

            {row ? (
              <div className="att-detail-sections">
                <section className="att-detail-section">
                  <h6 className="att-detail-section__title">Inscripción</h6>
                  <div className="att-detail-grid">
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Fecha de inscripción</span>
                      <span className="att-detail-item__value">{formatFechaCorta(row.fechaInscripcion)}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Periodo</span>
                      <span className="att-detail-item__value">{mesLabel} {row.año}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Sede</span>
                      <span className="att-detail-item__value">{row.sede || '—'}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Transporte</span>
                      <span className="att-detail-item__value">
                        <span className={`att-detail-chip ${transporteSi ? 'is-yes' : 'is-no'}`}>
                          {transporteSi ? 'Si' : 'No'}
                        </span>
                      </span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Fecha ingreso transporte</span>
                      <span className="att-detail-item__value">{formatFechaCorta(row.fechaIngresoNuevoTransporte)}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Fecha retiro transporte</span>
                      <span className="att-detail-item__value">{formatFechaCorta(row.fechaRetiroTransporte)}</span>
                    </div>
                    {estado === 'RETIRADO' ? (
                      <>
                        <div className="att-detail-item">
                          <span className="att-detail-item__label">Fecha de retiro</span>
                          <span className="att-detail-item__value">{formatFechaCorta(row.fechaRetiro)}</span>
                        </div>
                        <div className="att-detail-item att-detail-item--wide">
                          <span className="att-detail-item__label">Causal de retiro</span>
                          <span className="att-detail-item__value">{row.causalRetiro || '—'}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </section>

                {(row.camposExtra || []).filter((c) => c.visibleDetalle !== false).length > 0 ? (
                  <section className="att-detail-section">
                    <h6 className="att-detail-section__title">Campos del tipo</h6>
                    <div className="att-detail-grid">
                      {(row.camposExtra || [])
                        .filter((c) => c.visibleDetalle !== false)
                        .map((c) => (
                          <div
                            key={c.campoKey}
                            className={`att-detail-item${
                              isObservacionColumna(c.columnaDb) || isObsFacturacionColumna(c.columnaDb) || c.tipoInput === 'textarea'
                                ? ' att-detail-item--wide'
                                : ''
                            }`}
                          >
                            <span className="att-detail-item__label">{c.label}</span>
                            <span className="att-detail-item__value">
                              {c.tipoInput === 'date' || String(c.campoKey || '').toLowerCase().includes('fecha')
                                ? formatFechaCorta(c.value) || '—'
                                : displayCampoExtra(c)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </section>
                ) : null}

                <section className="att-detail-section">
                  <h6 className="att-detail-section__title">Curso</h6>
                  <div className="att-detail-grid">
                    <div className="att-detail-item att-detail-item--wide">
                      <span className="att-detail-item__label">Nombre</span>
                      <span className="att-detail-item__value">{row.nombreCurso || '—'}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Nombre corto</span>
                      <span className="att-detail-item__value">{row.nombreCortoCurso || '—'}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">ID curso</span>
                      <span className="att-detail-item__value">{row.idCurso || '—'}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Costo</span>
                      <span className="att-detail-item__value att-detail-item__value--em">{formatCurrencyCop(row.costo)}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Código facturación</span>
                      <span className="att-detail-item__value">{row.codigoFacturacion || '—'}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Línea</span>
                      <span className="att-detail-item__value">{row.nombreLinea || '—'}</span>
                    </div>
                    <div className="att-detail-item">
                      <span className="att-detail-item__label">Actividad</span>
                      <span className="att-detail-item__value">{row.nombreActividad || row.actividad || '—'}</span>
                    </div>
                    <div className="att-detail-item att-detail-item--wide">
                      <span className="att-detail-item__label">Entrenador</span>
                      <span className="att-detail-item__value">{row.entrenador || '—'}</span>
                    </div>
                  </div>
                </section>

                <div className="att-detail-split">
                  <section className="att-detail-section">
                    <div className="att-detail-section__head">
                      <h6 className="att-detail-section__title mb-0">Participante</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onOpenFicha('participante', row.documentoParticipante)}
                      >
                        Ver ficha
                      </button>
                    </div>
                    <div className="att-detail-person">
                      <div className="att-detail-person__name">{row.nombreParticipante || '—'}</div>
                      <div className="att-detail-person__meta">{row.documentoParticipante || '—'}</div>
                    </div>
                    <div className="att-detail-grid att-detail-grid--compact">
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Grupo</span>
                        <span className="att-detail-item__value">{row.grupo || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Nacimiento</span>
                        <span className="att-detail-item__value">{formatFechaCorta(row.fechaNacimiento)}</span>
                      </div>
                    </div>
                  </section>

                  <section className="att-detail-section">
                    <div className="att-detail-section__head">
                      <h6 className="att-detail-section__title mb-0">Responsable</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onOpenFicha('responsable', row.documentoResponsable)}
                      >
                        Ver ficha
                      </button>
                    </div>
                    <div className="att-detail-person">
                      <div className="att-detail-person__name">
                        {row.responsable?.nombreCompleto || row.documentoResponsable || '—'}
                      </div>
                      <div className="att-detail-person__meta">{row.documentoResponsable || '—'}</div>
                    </div>
                    <div className="att-detail-grid att-detail-grid--compact">
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Nombres</span>
                        <span className="att-detail-item__value">{row.responsable?.nombres || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Apellidos</span>
                        <span className="att-detail-item__value">{row.responsable?.apellidos || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Celular</span>
                        <span className="att-detail-item__value">{row.responsable?.celular || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Correo</span>
                        <span className="att-detail-item__value text-break">{row.responsable?.correo || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Ciudad</span>
                        <span className="att-detail-item__value">{row.responsable?.ciudad || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Dirección</span>
                        <span className="att-detail-item__value">{row.responsable?.direccion || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Tipo ID</span>
                        <span className="att-detail-item__value">{row.responsable?.tipoIdentificacion || '—'}</span>
                      </div>
                      <div className="att-detail-item">
                        <span className="att-detail-item__label">Tipo persona</span>
                        <span className="att-detail-item__value">{row.responsable?.tipoPersona || '—'}</span>
                      </div>
                    </div>
                  </section>
                </div>

                {(() => {
                  const extras = row.camposExtra || [];
                  const hideObs = extras.some(
                    (c) => c.visibleDetalle !== false && isObservacionColumna(c.columnaDb),
                  );
                  const hideFact = extras.some(
                    (c) => c.visibleDetalle !== false && isObsFacturacionColumna(c.columnaDb),
                  );
                  if (hideObs && hideFact) return null;
                  return (
                <section className="att-detail-section">
                  <h6 className="att-detail-section__title">Observaciones</h6>
                  <div className="att-detail-notes">
                    {!hideObs ? (
                    <div className="att-detail-note">
                      <div className="att-detail-item__label">Generales</div>
                      <p className="att-detail-note__text mb-0">{row.observaciones || 'Sin observaciones'}</p>
                    </div>
                    ) : null}
                    {!hideFact ? (
                    <div className="att-detail-note">
                      <div className="att-detail-item__label">Facturación</div>
                      <p className="att-detail-note__text mb-0">
                        {row.observacionFacturacion || 'Sin observación de facturación'}
                      </p>
                    </div>
                    ) : null}
                  </div>
                </section>
                  );
                })()}
              </div>
            ) : null}
    </GestionPanel>
  );
}

export function GestionInscripcionesPage({
  tipoFijo = 1,
  showOtrosLink = true,
  excludeTipo1 = false,
}) {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const moduloPerm = excludeTipo1 ? 'otros' : 'inscripciones';
  const canCreate = canGestion(permisosQuery.data, moduloPerm, 'crear');
  const canEdit = canGestion(permisosQuery.data, moduloPerm, 'editar');
  const canDelete = canGestion(permisosQuery.data, moduloPerm, 'eliminar');
  const canPaseMes = !excludeTipo1 && isSuperAdmin(user);
  const { toast, showToast, setToast } = useAttToast();
  const [paseMesBusy, setPaseMesBusy] = useState(false);
  const paseMesPeriodos = useMemo(() => {
    if (!canPaseMes) return null;
    const [desde, hacia] = periodosInscripcionPermitidosClient();
    return {
      desdeLabel: MESES_LABEL[desde.mes] || desde.mes,
      haciaLabel: MESES_LABEL[hacia.mes] || hacia.mes,
      haciaAnio: hacia.anio,
    };
  }, [canPaseMes]);
  const now = anioMesBogotaClient();
  const filterKey = excludeTipo1 ? 'gestion-filtros-otros' : 'gestion-filtros-tipo1';
  const initialFilters = useMemo(
    () =>
      loadGestionFilters(filterKey, {
        anio: String(now.anio),
        mes: excludeTipo1 ? [] : [now.mes],
        estado: [],
        sede: [],
        q: '',
        actividad: [],
        linea: [],
        tipoSel: tipoFijo == null ? '' : String(tipoFijo),
        idCursoFiltro: [],
        fechaDesde: '',
        fechaHasta: '',
      }),
    // solo al montar / cambiar de página (tipo1 vs otros)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey],
  );
  const [anio, setAnio] = useState(String(initialFilters.anio || now.anio));
  const [mes, setMes] = useState(() => {
    if (excludeTipo1) return [];
    const arr = asFilterArray(initialFilters.mes?.length ? initialFilters.mes : now.mes);
    return arr.slice(0, 1);
  });
  const [estado, setEstado] = useState(() => asFilterArray(initialFilters.estado));
  const [sede, setSede] = useState(() => asFilterArray(initialFilters.sede));
  const [q, setQ] = useState(initialFilters.q || '');
  const [actividad, setActividad] = useState(() => asFilterArray(initialFilters.actividad));
  const [linea, setLinea] = useState(() => asFilterArray(initialFilters.linea));
  const [fechaDesde, setFechaDesde] = useState(String(initialFilters.fechaDesde || ''));
  const [fechaHasta, setFechaHasta] = useState(String(initialFilters.fechaHasta || ''));
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sort: 'fecha', dir: 'desc' });
  const [tipoSel, setTipoSel] = useState(
    tipoFijo == null ? String(initialFilters.tipoSel || '') : String(tipoFijo),
  );
  const [detailId, setDetailId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [creating, setCreating] = useState(false);
  const [duplicateRow, setDuplicateRow] = useState(null);
  const [retirarRow, setRetirarRow] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [idCursoFiltro, setIdCursoFiltro] = useState(() =>
    asFilterArray(initialFilters.idCursoFiltro).slice(0, 1),
  );
  const [cursoSidebarQ, setCursoSidebarQ] = useState('');
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [colWidths, setColWidths] = useState(() => loadColWidths(DEFAULT_INSCRIPCIONES_COL_WIDTHS));
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;
  const qDebounced = useDebouncedValue(q, 350);
  const [draftFiltros, setDraftFiltros] = useState({
    anio: String(initialFilters.anio || now.anio),
    sede: asFilterArray(initialFilters.sede),
    actividad: asFilterArray(initialFilters.actividad),
    linea: asFilterArray(initialFilters.linea),
    idCursoFiltro: asFilterArray(initialFilters.idCursoFiltro),
    tipoSel: tipoFijo == null ? String(initialFilters.tipoSel || '') : String(tipoFijo),
    fechaDesde: String(initialFilters.fechaDesde || ''),
    fechaHasta: String(initialFilters.fechaHasta || ''),
  });

  useEffect(() => {
    if (excludeTipo1) setMes([]);
  }, [excludeTipo1]);

  useEffect(() => {
    saveGestionFilters(filterKey, {
      anio,
      mes: excludeTipo1 ? [] : mes,
      estado,
      sede,
      q,
      actividad: excludeTipo1 ? [] : actividad,
      linea,
      tipoSel: excludeTipo1 ? tipoSel : String(tipoFijo ?? 1),
      idCursoFiltro,
      fechaDesde,
      fechaHasta,
    });
  }, [
    filterKey,
    anio,
    mes,
    estado,
    sede,
    q,
    actividad,
    linea,
    tipoSel,
    idCursoFiltro,
    fechaDesde,
    fechaHasta,
    excludeTipo1,
    tipoFijo,
  ]);

  const effectiveTipo = tipoFijo != null ? tipoFijo : (tipoSel ? Number(tipoSel) : null);

  const tiposQuery = useQuery({
    queryKey: ['gestion-tipos'],
    queryFn: () => getJson('/api/gestion/tipos'),
    enabled: tipoFijo == null || isAdminLike(user),
    staleTime: 5 * 60_000,
  });

  const tiposOptions = useMemo(
    () =>
      (tiposQuery.data?.tipos || [])
        .filter((t) => Number(t.id) !== 1)
        .map((t) => ({ value: String(t.id), label: `${t.nombre} (${t.id})` })),
    [tiposQuery.data],
  );

  const cursosSidebarQuery = useQuery({
    queryKey: ['gestion-cursos-sidebar', effectiveTipo ?? (excludeTipo1 ? null : 1)],
    queryFn: () =>
      getJson(
        `/api/gestion/cursos?soloActivos=false&tipo=${encodeURIComponent(effectiveTipo ?? 1)}`,
      ),
    enabled: isAdminLike(user) && (excludeTipo1 ? Boolean(effectiveTipo) : true),
    staleTime: 60_000,
  });

  const cursosSidebar = cursosSidebarQuery.data?.cursos || [];

  const prevTipoRef = useRef(effectiveTipo);
  useEffect(() => {
    if (prevTipoRef.current === effectiveTipo) return;
    prevTipoRef.current = effectiveTipo;
    setIdCursoFiltro([]);
    setPage(1);
  }, [effectiveTipo]);

  const metaParams = useMemo(() => {
    const u = new URLSearchParams();
    u.set('anio', anio);
    if (excludeTipo1) u.set('excludeTipo1', 'true');
    if (effectiveTipo != null && Number.isFinite(effectiveTipo)) u.set('tipo', String(effectiveTipo));
    else if (!excludeTipo1) u.set('tipo', '1');
    // No incluir mes: al cambiar mes no hace falta recalcular facetas (el facet de mes lo omite).
    const estadoP = joinFilterParam(estado);
    if (estadoP) u.set('estado', estadoP);
    const sedeP = joinFilterParam(sede);
    if (sedeP) u.set('sede', sedeP);
    const actP = joinFilterParam(actividad);
    if (!excludeTipo1 && actP) u.set('actividad', actP);
    const linP = joinFilterParam(linea);
    if (linP) u.set('linea', linP);
    const cursoP = joinFilterParam(idCursoFiltro);
    if (cursoP) u.set('idCurso', cursoP);
    if (fechaDesde) u.set('fechaDesde', fechaDesde);
    if (fechaHasta) u.set('fechaHasta', fechaHasta);
    return u.toString();
  }, [
    anio,
    estado,
    sede,
    actividad,
    linea,
    effectiveTipo,
    excludeTipo1,
    idCursoFiltro,
    fechaDesde,
    fechaHasta,
  ]);

  const metaQuery = useQuery({
    queryKey: ['gestion-filtros-meta', metaParams],
    queryFn: () => getJson(`/api/gestion/filtros-meta?${metaParams}`),
    enabled: isAdminLike(user) && (tipoFijo != null || Boolean(effectiveTipo)),
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  /** Meses del panel izquierdo: solo año+tipo (barato y estable al filtrar). */
  const mesesSidebarParams = useMemo(() => {
    if (excludeTipo1) return '';
    const u = new URLSearchParams();
    u.set('anio', anio);
    u.set('tipo', '1');
    return u.toString();
  }, [anio, excludeTipo1]);

  const mesesSidebarQuery = useQuery({
    queryKey: ['gestion-meses-sidebar', mesesSidebarParams],
    queryFn: () => getJson(`/api/gestion/filtros-meta?${mesesSidebarParams}`),
    enabled: isAdminLike(user) && !excludeTipo1 && Boolean(mesesSidebarParams),
    staleTime: 120_000,
    placeholderData: (prev) => prev,
  });

  const anioOptions = useMemo(
    () => buildAnioOptions(metaQuery.data?.anios, now.anio),
    [metaQuery.data, now.anio],
  );

  const anioFilterOptions = useMemo(() => {
    const rows = metaQuery.data?.anios || [];
    const byValue = new Map();
    // Base: años recientes siempre disponibles (evita que el facet vacío “rompa” el filtro).
    for (const o of anioOptions) {
      byValue.set(String(o.value), { value: String(o.value), label: String(o.label) });
    }
    for (const r of rows) {
      const v = String(r.anio);
      byValue.set(v, { value: v, label: `${r.anio} (${r.total})` });
    }
    if (anio && !byValue.has(String(anio))) {
      byValue.set(String(anio), { value: String(anio), label: String(anio) });
    }
    return [...byValue.values()].sort((a, b) => Number(b.value) - Number(a.value));
  }, [metaQuery.data, anioOptions, anio]);

  const mesOptions = useMemo(() => {
    const source = mesesSidebarQuery.data?.meses || metaQuery.data?.meses || [];
    const counts = new Map(source.map((m) => [String(m.mes).padStart(2, '0'), Number(m.total || 0)]));
    const selected = asFilterArray(mes).map((m) => String(m).padStart(2, '0'));
    return Object.entries(MESES_LABEL)
      .slice()
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([v, l]) => ({
        value: v,
        label: l,
        shortLabel: MESES_SHORT[v] || l.slice(0, 3),
        total: counts.get(v) || 0,
      }))
      .filter((o) => o.total > 0 || selected.includes(o.value));
  }, [mesesSidebarQuery.data, metaQuery.data, mes]);

  const estadoOptions = useMemo(() => {
    const rows = metaQuery.data?.estados || [];
    return rows.map((r) => ({
      value: r.estado,
      label: `${r.estado} (${r.total})`,
    }));
  }, [metaQuery.data]);

  const actividadOptions = useMemo(() => {
    const rows = metaQuery.data?.actividades || [];
    return rows.map((r) => ({
      value: String(r.id),
      label: `${r.nombre} (${r.total})`,
    }));
  }, [metaQuery.data]);

  const lineaOptions = useMemo(() => {
    const rows = metaQuery.data?.lineas || [];
    return rows.map((r) => ({
      value: String(r.id),
      label: `${r.nombre || r.id} (${r.total})`,
      searchText: `${r.id} ${r.nombre || ''}`,
    }));
  }, [metaQuery.data]);

  const sedeOptions = useMemo(
    () => SEDES.map((s) => ({ value: s, label: s })),
    [],
  );

  const categoriaOptions = useMemo(() => {
    const countMap = new Map(
      (metaQuery.data?.cursos || []).map((c) => [String(c.id), Number(c.total || 0)]),
    );
    const actividadMap = new Map(
      (metaQuery.data?.cursos || []).map((c) => [String(c.id), c.actividadId != null ? String(c.actividadId) : null]),
    );
    const catalog = cursosSidebar.length
      ? cursosSidebar
      : (metaQuery.data?.cursos || []).map((c) => ({
          id: c.id,
          nombre: c.nombre,
          actividad: c.actividadId,
        }));

    const actSet = new Set(asFilterArray(actividad).map(String));
    const filtered = catalog.filter((c) => {
      if (!actSet.size) return true;
      const actId =
        c.actividad != null && String(c.actividad).trim() !== ''
          ? String(c.actividad)
          : actividadMap.get(String(c.id));
      return actSet.has(String(actId || ''));
    });

    return filtered
      .slice()
      .sort((a, b) => String(a.nombre || a.id).localeCompare(String(b.nombre || b.id), 'es'))
      .map((c) => {
        const n = countMap.get(String(c.id)) || 0;
        return {
          value: String(c.id),
          label: `${c.nombre || c.id} (${n})`,
          searchText: `${c.id} ${c.nombre || ''}`,
        };
      });
  }, [metaQuery.data, cursosSidebar, actividad]);

  useEffect(() => {
    const selected = asFilterArray(idCursoFiltro);
    if (!selected.length || excludeTipo1) return;
    const valid = new Set(categoriaOptions.map((o) => String(o.value)));
    const next = selected.filter((id) => valid.has(String(id)));
    if (next.length !== selected.length) {
      setIdCursoFiltro(next);
      setPage(1);
    }
  }, [idCursoFiltro, categoriaOptions, excludeTipo1]);

  const listParams = useMemo(() => {
    const u = new URLSearchParams();
    u.set('anio', anio);
    u.set('page', String(page));
    u.set('limit', '50');
    const mesP = joinFilterParam(mes);
    if (!excludeTipo1 && mesP) u.set('mes', mesP);
    const estadoP = joinFilterParam(
      asFilterArray(estado).filter((e) => e && e !== 'TODOS'),
    );
    if (estadoP) u.set('estado', estadoP);
    const sedeP = joinFilterParam(sede);
    if (sedeP) u.set('sede', sedeP);
    if (qDebounced.trim()) u.set('q', qDebounced.trim());
    const actP = joinFilterParam(actividad);
    if (!excludeTipo1 && actP) u.set('actividad', actP);
    const linP = joinFilterParam(linea);
    if (linP) u.set('linea', linP);
    if (excludeTipo1) u.set('excludeTipo1', 'true');
    if (effectiveTipo != null && Number.isFinite(effectiveTipo)) u.set('tipo', String(effectiveTipo));
    const cursoP = joinFilterParam(idCursoFiltro);
    if (cursoP) u.set('idCurso', cursoP);
    if (fechaDesde) u.set('fechaDesde', fechaDesde);
    if (fechaHasta) u.set('fechaHasta', fechaHasta);
    if (sort.sort) {
      u.set('sort', sort.sort);
      u.set('dir', sort.dir);
    }
    return u.toString();
  }, [
    anio,
    mes,
    estado,
    sede,
    qDebounced,
    actividad,
    linea,
    page,
    effectiveTipo,
    excludeTipo1,
    idCursoFiltro,
    fechaDesde,
    fechaHasta,
    sort.sort,
    sort.dir,
  ]);

  // Al terminar de tipear, volver a página 1 sin esperar otro efecto de setPage en cada tecla.
  const prevQDebounced = useRef(qDebounced);
  useEffect(() => {
    if (prevQDebounced.current === qDebounced) return;
    prevQDebounced.current = qDebounced;
    setPage(1);
  }, [qDebounced]);

  const filtrosAvanzadosActivos = useMemo(() => {
    let n = 0;
    if (String(anio) !== String(now.anio)) n += 1;
    if (asFilterArray(sede).length) n += 1;
    if (!excludeTipo1 && asFilterArray(actividad).length) n += 1;
    if (asFilterArray(linea).length) n += 1;
    if (asFilterArray(idCursoFiltro).length) n += 1;
    if (fechaDesde) n += 1;
    if (fechaHasta) n += 1;
    return n;
  }, [anio, now.anio, sede, actividad, linea, idCursoFiltro, excludeTipo1, fechaDesde, fechaHasta]);

  const openFiltrosDrawer = () => {
    setDraftFiltros({
      anio: String(anio || now.anio),
      sede: asFilterArray(sede),
      actividad: asFilterArray(actividad),
      linea: asFilterArray(linea),
      idCursoFiltro: asFilterArray(idCursoFiltro),
      tipoSel: tipoSel || '',
      fechaDesde: fechaDesde || '',
      fechaHasta: fechaHasta || '',
    });
    setFiltrosOpen(true);
  };

  const aplicarFiltrosDrawer = () => {
    let desde = String(draftFiltros.fechaDesde || '').trim().slice(0, 10);
    let hasta = String(draftFiltros.fechaHasta || '').trim().slice(0, 10);
    if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) desde = '';
    if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) hasta = '';
    if (desde && hasta && desde > hasta) {
      const tmp = desde;
      desde = hasta;
      hasta = tmp;
    }
    setAnio(String(draftFiltros.anio || now.anio));
    setSede(asFilterArray(draftFiltros.sede));
    setLinea(asFilterArray(draftFiltros.linea));
    if (!excludeTipo1) {
      setActividad(asFilterArray(draftFiltros.actividad));
    }
    setIdCursoFiltro(asFilterArray(draftFiltros.idCursoFiltro).slice(0, 1));
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setPage(1);
    setFiltrosOpen(false);
  };

  const limpiarFiltrosDrawer = () => {
    setDraftFiltros({
      anio: String(now.anio),
      sede: [],
      actividad: [],
      linea: [],
      idCursoFiltro: [],
      tipoSel: tipoSel || '',
      fechaDesde: '',
      fechaHasta: '',
    });
  };

  const quitarFiltroRapido = (key) => {
    if (key === 'sede') setSede([]);
    if (key === 'actividad') {
      setActividad([]);
      setIdCursoFiltro([]);
    }
    if (key === 'linea') setLinea([]);
    if (key === 'idCurso') setIdCursoFiltro([]);
    if (key === 'fechas') {
      setFechaDesde('');
      setFechaHasta('');
    }
    if (key === 'anio') setAnio(String(now.anio));
    setPage(1);
  };

  const limpiarFiltrosRapidos = () => {
    setAnio(String(now.anio));
    setSede([]);
    setActividad([]);
    setLinea([]);
    setIdCursoFiltro([]);
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  };

  const listEnabled =
    isAdminLike(user) && (tipoFijo != null || (excludeTipo1 && Boolean(effectiveTipo)));

  const listQuery = useQuery({
    queryKey: ['gestion-inscripciones', listParams],
    queryFn: () => getJson(`/api/gestion/inscripciones?${listParams}`),
    enabled: listEnabled,
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    // No pisar un año válido elegido por el usuario solo porque el facet no lo trae
    // (p. ej. por otros filtros activos en Otros tipos).
    if (!/^\d{4}$/.test(String(anio || ''))) {
      const rows = metaQuery.data?.anios || [];
      if (rows.length) {
        setAnio(String(rows[0].anio));
        setPage(1);
      }
    }
  }, [metaQuery.data, anio]);

  const cursosSidebarFromMeta = useMemo(() => {
    const countMap = new Map(
      (metaQuery.data?.cursos || []).map((c) => [String(c.id), Number(c.total || 0)]),
    );
    if (cursosSidebar.length) {
      return cursosSidebar.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        total: countMap.get(String(c.id)) || 0,
      }));
    }
    return metaQuery.data?.cursos || [];
  }, [metaQuery.data, cursosSidebar]);

  const cursosSidebarTotal = useMemo(
    () => cursosSidebarFromMeta.reduce((acc, c) => acc + Number(c.total || 0), 0),
    [cursosSidebarFromMeta],
  );

  const cursosSidebarFiltered = useMemo(() => {
    const selected = new Set(asFilterArray(idCursoFiltro).map(String));
    const withData = cursosSidebarFromMeta.filter(
      (c) => Number(c.total || 0) > 0 || selected.has(String(c.id)),
    );
    const qNorm = String(cursoSidebarQ || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (!qNorm) return withData;
    return withData.filter((c) => {
      const hay = `${c.id || ''} ${c.nombre || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return hay.includes(qNorm);
    });
  }, [cursosSidebarFromMeta, cursoSidebarQ, idCursoFiltro]);

  const invalidateList = async (message) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['gestion-inscripciones'] }),
      queryClient.invalidateQueries({ queryKey: ['gestion-filtros-meta'] }),
      queryClient.invalidateQueries({ queryKey: ['gestion-meses-sidebar'] }),
      queryClient.invalidateQueries({ queryKey: ['gestion-cursos'] }),
      queryClient.invalidateQueries({ queryKey: ['gestion-cursos-sidebar'] }),
    ]);
    if (message) showToast('success', message);
  };

  const pasarMesSiguiente = async () => {
    if (!canPaseMes || paseMesBusy) return;
    setPaseMesBusy(true);
    try {
      const preview = await getJson('/api/gestion/inscripciones/pasar-mes/preview');
      const desde = preview?.desde;
      const hacia = preview?.hacia;
      const candidatos = Number(preview?.candidatos || 0);
      const mesDesdeLabel = MESES_LABEL[String(desde?.mes || '').padStart(2, '0')] || desde?.mes;
      const mesHaciaLabel = MESES_LABEL[String(hacia?.mes || '').padStart(2, '0')] || hacia?.mes;
      if (candidatos < 1) {
        showToast(
          'success',
          `No hay inscripciones de ${mesDesdeLabel}/${desde?.anio} pendientes por pasar a ${mesHaciaLabel}/${hacia?.anio}.`,
        );
        return;
      }
      const ok = window.confirm(
        `Pasar ${candidatos} inscripción(es) Tipo=1\n` +
          `De: ${mesDesdeLabel} ${desde?.anio} → A: ${mesHaciaLabel} ${hacia?.anio}\n` +
          `Periodo destino: ${hacia?.periodo}\n` +
          `Se excluye el curso ${preview?.cursoExcluido || '20262'}.\n` +
          `No se duplican participante+curso ya presentes en el mes destino (incluye RETIRADO).\n\n` +
          `Esta acción es irreversible. ¿Continuar?`,
      );
      if (!ok) return;

      const result = await postJson('/api/gestion/inscripciones/pasar-mes', { confirm: true });
      const insertados = Number(result?.insertados || 0);
      const haciaRes = result?.hacia || hacia;
      if (haciaRes?.anio) setAnio(String(haciaRes.anio));
      if (haciaRes?.mes) setMes([String(haciaRes.mes).padStart(2, '0')]);
      setPage(1);
      await invalidateList(
        insertados > 0
          ? `Se pasaron ${insertados} inscripción(es) a ${MESES_LABEL[String(haciaRes?.mes || '').padStart(2, '0')] || haciaRes?.mes}/${haciaRes?.anio}`
          : 'No se insertaron filas nuevas',
      );
    } catch (err) {
      showToast('danger', err?.message || 'No se pudo pasar el mes');
    } finally {
      setPaseMesBusy(false);
    }
  };

  const deleteInscripcion = async (row) => {
    if (!row?.id) return;
    const ok = window.confirm(
      `¿Eliminar la inscripción #${row.id} de ${row.nombreParticipante || row.documentoParticipante || 'este participante'}?\n\nEsta acción no se puede deshacer.`,
    );
    if (!ok) return;
    try {
      await deleteJson(`/api/gestion/inscripciones/${row.id}`);
      if (detailId === row.id) setDetailId(null);
      await invalidateList('Inscripción eliminada');
    } catch (err) {
      showToast('danger', err?.message || 'No se pudo eliminar la inscripción');
    }
  };

  const exportExcel = async () => {
    if (!listEnabled) return;
    setExporting(true);
    try {
      const u = new URLSearchParams(listParams);
      u.delete('page');
      u.delete('limit');
      u.set('export', 'true');
      const data = await getJson(`/api/gestion/inscripciones?${u.toString()}`);
      const rows = data?.inscritos || [];
      const exportCampos = data?.camposLista || listQuery.data?.camposLista || [];
      const mesSuffix = joinFilterParam(mes);
      const { exportRowsToExcel } = await import('../../lib/exportExcel.js');
      await exportRowsToExcel({
        rows,
        sheetName: 'Inscripciones',
        fileNamePrefix: `inscripciones_${anio}${mesSuffix ? `_${mesSuffix.replace(/,/g, '-')}` : ''}`,
        columns: [
          { key: 'fechaInscripcion', header: 'Fecha inscripción', format: (v) => formatFechaCorta(v) },
          { key: 'documentoParticipante', header: 'Documento participante' },
          { key: 'nombreParticipante', header: 'Participante' },
          {
            key: 'fechaNacimiento',
            header: 'Fecha nacimiento',
            format: (v) => formatFechaCorta(v),
          },
          { key: 'documentoResponsable', header: 'Documento responsable' },
          { key: 'tipoDocumentoResponsable', header: 'Tipo doc. responsable' },
          { key: 'nombreResponsable', header: 'Responsable' },
          { key: 'celularResponsable', header: 'Celular responsable' },
          { key: 'correoResponsable', header: 'Correo responsable' },
          { key: 'idCurso', header: 'ID curso' },
          {
            key: 'nombreCurso',
            header: 'Curso / categoría',
            format: (v, row) => v || row?.idCurso || '',
          },
          {
            key: 'nombreLinea',
            header: 'Línea',
            format: (v, row) => v || row?.lineaId || '',
          },
          {
            key: 'nombreActividad',
            header: 'Actividad',
            format: (v, row) => v || row?.actividadId || '',
          },
          { key: 'costoCurso', header: 'Valor curso' },
          { key: 'estado', header: 'Estado' },
          {
            key: 'mes',
            header: 'Mes',
            format: (v) => MESES_LABEL[String(v).padStart(2, '0')] || v || '',
          },
          { key: 'año', header: 'Año' },
          { key: 'sede', header: 'Sede' },
          {
            key: 'transporte',
            header: 'Transporte',
            format: (v) => (String(v || '').toUpperCase() === 'SI' ? 'Si' : 'No'),
          },
          { key: 'codigoFacturacion', header: 'Código facturación' },
          { key: 'observaciones', header: 'Observaciones' },
          { key: 'observacionFacturacion', header: 'Obs. facturación' },
          { key: 'causalRetiro', header: 'Causal retiro' },
          {
            key: 'fechaRetiro',
            header: 'Fecha retiro',
            format: (v) => formatFechaCorta(v),
          },
          {
            key: 'fechaRetiroTransporte',
            header: 'Fecha retiro transporte',
            format: (v) => formatFechaCorta(v),
          },
          ...exportCampos.map((c) => ({
            key: `extra_${c.campoKey}`,
            header: c.label || c.campoKey,
            format: (_v, row) => {
              const found = (row?.camposExtra || []).find((x) => x.campoKey === c.campoKey);
              if (!found) return '';
              return found.displayValue ?? found.valueLabel ?? found.value ?? '';
            },
          })),
        ],
      });
    } catch (err) {
      showToast('danger', err?.message || 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const rows = listQuery.data?.inscritos || [];
  const meta = listQuery.data?.meta || { page: 1, totalPages: 1, total: 0 };
  const camposLista = listQuery.data?.camposLista || [];
  const tableColSpan = 11 + camposLista.length;
  const showSidebar = !excludeTipo1 || Boolean(effectiveTipo);

  const colStyle = (key) => {
    const w =
      colWidths[key] ??
      DEFAULT_INSCRIPCIONES_COL_WIDTHS[key] ??
      (String(key).startsWith('extra_') ? 100 : undefined);
    if (w == null) return undefined;
    return { width: w, minWidth: w, maxWidth: w };
  };

  const onColResizeStart = (key, e) => {
    const startX = e.clientX ?? e.touches?.[0]?.clientX;
    if (!Number.isFinite(startX)) return;
    const startWidth =
      colWidthsRef.current[key] ??
      DEFAULT_INSCRIPCIONES_COL_WIDTHS[key] ??
      120;
    startColumnResize({
      key,
      startX,
      startWidth,
      onChange: (k, next) => {
        setColWidths((prev) => ({ ...prev, [k]: next }));
      },
      onEnd: () => {
        saveColWidths(colWidthsRef.current);
      },
    });
  };

  const toggleMesSidebar = (mesValue) => {
    const v = String(mesValue).padStart(2, '0');
    setMes((prev) => {
      const cur = asFilterArray(prev);
      // Selección única: si ya está activo, vuelve a "todos"; si no, solo ese mes.
      return cur.length === 1 && cur[0] === v ? [] : [v];
    });
    setPage(1);
  };

  const selectCursoSidebar = (cursoId) => {
    const id = String(cursoId);
    setIdCursoFiltro((prev) => {
      const cur = asFilterArray(prev);
      return cur.length === 1 && cur[0] === id ? [] : [id];
    });
    setPage(1);
  };

  return (
    <div
      className={`att-main att-main--wide att-admin-page att-gestion-page att-gestion-page--fill${
        excludeTipo1 ? ' att-gestion-page--otros' : ''
      }`}
    >
      <div className="att-gestion-page__top">
        <div className="att-gestion-page__toolbar">
          <div className="att-gestion-page__actions">
            {canPaseMes ? (
              <button
                type="button"
                className={`att-pase-mes${paseMesBusy ? ' is-busy' : ''}`}
                disabled={paseMesBusy}
                title="Copiar inscritos del mes actual al siguiente (solo SuperAdministrador)"
                onClick={pasarMesSiguiente}
              >
                <span className="att-pase-mes__icon" aria-hidden="true">
                  {paseMesBusy ? <span className="att-pase-mes__spinner" /> : <IconMonthPass size={18} />}
                </span>
                <span className="att-pase-mes__copy">
                  <span className="att-pase-mes__label">
                    {paseMesBusy ? 'Pasando mes…' : 'Pasar al mes siguiente'}
                  </span>
                  {paseMesPeriodos ? (
                    <span className="att-pase-mes__meta">
                      <span>{paseMesPeriodos.desdeLabel}</span>
                      <span className="att-pase-mes__arrow" aria-hidden="true">
                        →
                      </span>
                      <span>
                        {paseMesPeriodos.haciaLabel} {paseMesPeriodos.haciaAnio}
                      </span>
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
            <GestionPanelModeToggle />
            <GestionNav />
          </div>
        </div>

      <section className="att-admin-filters att-gestion-filters card border-0 shadow-sm mb-3">
        <div className="card-body py-2 py-md-3">
          <div className="att-gestion-filters__bar">
            {excludeTipo1 ? (
              <div className="att-gestion-filters__field att-gestion-filters__field--tipo">
                <label className="form-label small mb-1">Tipo</label>
                <SearchableSelect
                  value={tipoSel}
                  onChange={(v) => {
                    setTipoSel(v);
                    setIdCursoFiltro([]);
                    setPage(1);
                  }}
                  options={tiposOptions}
                  placeholder="Seleccione tipo…"
                  allowClear={false}
                />
              </div>
            ) : null}
            <div className="att-gestion-filters__field att-gestion-filters__field--estado">
              <label className="form-label small mb-1">Estado</label>
              <MultiSearchableSelect
                value={estado}
                onChange={(v) => {
                  setEstado(asFilterArray(v));
                  setPage(1);
                }}
                options={estadoOptions}
                placeholder="Todos"
              />
            </div>
            <div className="att-gestion-filters__field att-gestion-filters__field--search">
              <label className="form-label small mb-1">Buscar</label>
              <GestionSearchInput
                placeholder="Participante, responsable, documento, curso…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                }}
              />
            </div>
            <div className="att-gestion-filters__field att-gestion-filters__field--more">
              <label className="form-label small mb-1 d-none d-sm-block">&nbsp;</label>
              <button
                type="button"
                className={`att-gestion-filters-btn w-100${filtrosAvanzadosActivos ? ' is-active' : ''}`}
                onClick={openFiltrosDrawer}
              >
                <span className="att-gestion-filters-btn__icon" aria-hidden="true">
                  <IconFilters size={16} />
                </span>
                <span className="att-gestion-filters-btn__copy">
                  <span className="att-gestion-filters-btn__label">Más filtros</span>
                  <span className="att-gestion-filters-btn__hint d-none d-md-inline">
                    {filtrosAvanzadosActivos
                      ? `${filtrosAvanzadosActivos} activo${filtrosAvanzadosActivos === 1 ? '' : 's'}`
                      : 'Año, sede, línea…'}
                  </span>
                </span>
                {filtrosAvanzadosActivos > 0 ? (
                  <span className="att-gestion-filters-btn__badge">{filtrosAvanzadosActivos}</span>
                ) : null}
              </button>
            </div>
          </div>
          {filtrosAvanzadosActivos > 0 ? (
            <div className="att-gestion-filter-chips mt-2">
              {String(anio) !== String(now.anio) ? (
                <button
                  type="button"
                  className="att-gestion-filter-chip"
                  onClick={() => quitarFiltroRapido('anio')}
                  title="Quitar filtro de año"
                >
                  Año: {anio}
                  <span className="att-gestion-filter-chip__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
              {asFilterArray(sede).length ? (
                <button
                  type="button"
                  className="att-gestion-filter-chip"
                  onClick={() => quitarFiltroRapido('sede')}
                  title="Quitar sede"
                >
                  Sede:{' '}
                  {asFilterArray(sede)
                    .map((s) => sedeOptions.find((o) => o.value === String(s))?.label || s)
                    .join(', ')}
                  <span className="att-gestion-filter-chip__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
              {fechaDesde || fechaHasta ? (
                <button
                  type="button"
                  className="att-gestion-filter-chip"
                  onClick={() => quitarFiltroRapido('fechas')}
                  title="Quitar rango de fechas"
                >
                  Inscripción: {fechaDesde || '…'} → {fechaHasta || '…'}
                  <span className="att-gestion-filter-chip__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
              {!excludeTipo1 && asFilterArray(actividad).length ? (
                <button
                  type="button"
                  className="att-gestion-filter-chip"
                  onClick={() => quitarFiltroRapido('actividad')}
                  title="Quitar actividad"
                >
                  Actividad:{' '}
                  {asFilterArray(actividad)
                    .map((a) => actividadOptions.find((o) => o.value === String(a))?.label || a)
                    .join(', ')}
                  <span className="att-gestion-filter-chip__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
              {asFilterArray(linea).length ? (
                <button
                  type="button"
                  className="att-gestion-filter-chip"
                  onClick={() => quitarFiltroRapido('linea')}
                  title="Quitar línea"
                >
                  Línea:{' '}
                  {asFilterArray(linea)
                    .map((l) => lineaOptions.find((o) => o.value === String(l))?.label || l)
                    .join(', ')}
                  <span className="att-gestion-filter-chip__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
              {asFilterArray(idCursoFiltro).length ? (
                <button
                  type="button"
                  className="att-gestion-filter-chip"
                  onClick={() => quitarFiltroRapido('idCurso')}
                  title="Quitar categoría / curso"
                >
                  {excludeTipo1 ? 'Curso' : 'Categoría'}:{' '}
                  {asFilterArray(idCursoFiltro)
                    .map(
                      (id) =>
                        categoriaOptions.find((o) => o.value === String(id))?.label ||
                        cursosSidebarFromMeta.find((c) => String(c.id) === String(id))?.nombre ||
                        id,
                    )
                    .join(', ')}
                  <span className="att-gestion-filter-chip__x" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className="att-gestion-filter-chip att-gestion-filter-chip--clear"
                onClick={limpiarFiltrosRapidos}
                title="Quitar todos los filtros avanzados"
              >
                Limpiar todo
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {excludeTipo1 && !effectiveTipo ? (
        <div className="alert alert-info small">Seleccione un tipo para ver las inscripciones.</div>
      ) : null}
      {listQuery.isError ? <div className="alert alert-danger small">{listQuery.error?.message}</div> : null}
      </div>

      <div className={`att-gestion-layout ${showSidebar ? 'att-gestion-layout--with-sidebar' : ''} ${!excludeTipo1 ? 'att-gestion-layout--meses' : 'att-gestion-layout--cursos'}`}>
        {showSidebar ? (
          <aside className="att-gestion-course-panel card border-0 shadow-sm">
            {!excludeTipo1 ? (
              <>
                <div className="att-gestion-course-panel__head">Mes</div>
                <div className="att-gestion-course-panel__scroll">
                  <button
                    type="button"
                    className={`att-gestion-course-panel__item ${!asFilterArray(mes).length ? 'is-active' : ''}`}
                    onClick={() => {
                      setMes([]);
                      setPage(1);
                    }}
                  >
                    <span className="att-gestion-course-panel__name">Todos</span>
                  </button>
                  {mesOptions.map((o) => {
                    const selected = asFilterArray(mes).includes(String(o.value));
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className={`att-gestion-course-panel__item ${selected ? 'is-active' : ''}`}
                        onClick={() => toggleMesSidebar(o.value)}
                      >
                        <span className="att-gestion-course-panel__name" title={o.label}>
                          {o.shortLabel}
                        </span>
                        <span className="att-gestion-course-panel__count">{o.total}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="att-gestion-course-panel__head">Cursos</div>
                <div className="att-gestion-course-panel__search">
                  <GestionSearchInput
                    placeholder="Buscar curso…"
                    value={cursoSidebarQ}
                    onChange={(e) => setCursoSidebarQ(e.target.value)}
                    aria-label="Buscar curso en filtros rápidos"
                  />
                </div>
                <div className="att-gestion-course-panel__scroll">
                  <button
                    type="button"
                    className={`att-gestion-course-panel__item ${!asFilterArray(idCursoFiltro).length ? 'is-active' : ''}`}
                    onClick={() => {
                      setIdCursoFiltro([]);
                      setPage(1);
                    }}
                  >
                    <span className="att-gestion-course-panel__name">Todos</span>
                    <span className="att-gestion-course-panel__count">{cursosSidebarTotal}</span>
                  </button>
                  {cursosSidebarQuery.isPending && !cursosSidebarFromMeta.length ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" />
                    </div>
                  ) : null}
                  {cursosSidebarFiltered.map((c) => {
                    const selected = asFilterArray(idCursoFiltro).includes(String(c.id));
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`att-gestion-course-panel__item ${selected ? 'is-active' : ''}`}
                        onClick={() => selectCursoSidebar(c.id)}
                        title={c.nombre}
                      >
                        <span className="att-gestion-course-panel__name">{c.nombre || c.id}</span>
                        <span className="att-gestion-course-panel__count">{Number(c.total || 0)}</span>
                      </button>
                    );
                  })}
                  {!cursosSidebarQuery.isPending &&
                  !metaQuery.isPending &&
                  cursosSidebarFromMeta.length === 0 ? (
                    <div className="small text-muted px-3 py-2">Sin cursos para este tipo</div>
                  ) : null}
                  {!cursosSidebarQuery.isPending &&
                  cursosSidebarFromMeta.length > 0 &&
                  cursosSidebarFiltered.length === 0 ? (
                    <div className="small text-muted px-3 py-2">Sin coincidencias</div>
                  ) : null}
                </div>
              </>
            )}
          </aside>
        ) : null}

      <div className={`card border-0 shadow-sm att-gestion-table-card${listQuery.isFetching ? ' is-fetching' : ''}`}>
        <div className="card-body p-0">
          <div className="table-responsive att-gestion-table-wrap att-admin-table-wrap--mobile-safe">
            <table className="table table-sm table-hover mb-0 att-admin-table att-gestion-table att-gestion-table--dense">
              <thead className="att-sortable-head">
                <tr>
                  <SortableTh
                    label="Fecha"
                    column="fecha"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.fecha}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Participante"
                    column="participante"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.participante}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Curso"
                    column="curso"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.curso}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Estado"
                    column="estado"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.estado}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Mes"
                    column="mes"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.mes}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Año"
                    column="anio"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.anio}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Sede"
                    column="sede"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.sede}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <SortableTh
                    label="Transp."
                    column="transporte"
                    sort={sort.sort}
                    dir={sort.dir}
                    width={colWidths.transporte}
                    onResizeStart={onColResizeStart}
                    onSort={(column) => {
                      setSort((current) => toggleColumnSort(current, column));
                      setPage(1);
                    }}
                  />
                  <th
                    className="att-gestion-th-resizable"
                    style={colStyle('observaciones')}
                  >
                    <span className="att-gestion-th-label">Obs.</span>
                    <span
                      className="att-gestion-col-resizer"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Redimensionar columna Observación"
                      title="Arrastrar para cambiar el ancho"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onColResizeStart('observaciones', e);
                      }}
                    />
                  </th>
                  {camposLista.map((c) => {
                    const key = `extra_${c.campoKey}`;
                    return (
                      <th
                        key={c.campoKey}
                        className="att-gestion-extra-col att-gestion-th-resizable"
                        style={colStyle(key)}
                        title={c.label}
                      >
                        <span className="att-gestion-th-label">{c.label}</span>
                        <span
                          className="att-gestion-col-resizer"
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Redimensionar columna ${c.label}`}
                          title="Arrastrar para cambiar el ancho"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onColResizeStart(key, e);
                          }}
                        />
                      </th>
                    );
                  })}
                  <th className="att-gestion-actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isPending && !listQuery.data ? (
                  <tr>
                    <td colSpan={tableColSpan} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" />
                    </td>
                  </tr>
                ) : null}
                {!listQuery.isPending && listEnabled && rows.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="text-center text-muted py-4">Sin resultados</td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="text-nowrap" style={colStyle('fecha')} data-label="Fecha">
                      {formatFechaCorta(row.fechaInscripcion)}
                    </td>
                    <td style={colStyle('participante')} data-label="Participante">
                      <div className="fw-semibold att-gestion-cell-clip">{row.nombreParticipante || '—'}</div>
                      <div className="small text-muted att-gestion-cell-clip">{row.documentoParticipante}</div>
                    </td>
                    <td style={colStyle('curso')} data-label="Curso">
                      <div className="att-gestion-cell-clip">{row.nombreCurso || row.idCurso}</div>
                      <div className="small text-muted att-gestion-cell-clip">{row.idCurso}</div>
                    </td>
                    <td style={colStyle('estado')} data-label="Estado">
                      <span className="badge text-bg-light border">{row.estado}</span>
                    </td>
                    <td className="text-nowrap" style={colStyle('mes')} data-label="Mes">
                      {MESES_SHORT[String(row.mes).padStart(2, '0')] ||
                        MESES_LABEL[String(row.mes).padStart(2, '0')] ||
                        row.mes}
                    </td>
                    <td className="text-nowrap" style={colStyle('anio')} data-label="Año">
                      {row.año}
                    </td>
                    <td className="text-nowrap" style={colStyle('sede')} data-label="Sede">
                      {row.sede}
                    </td>
                    <td style={colStyle('transporte')} data-label="Transporte">
                      {String(row.transporte || '').toUpperCase() === 'SI' ? 'Si' : 'No'}
                    </td>
                    <td
                      className="att-gestion-cell-clip"
                      style={colStyle('observaciones')}
                      data-label="Observación"
                      title={row.observaciones || ''}
                    >
                      {row.observaciones || '—'}
                    </td>
                    {camposLista.map((c) => {
                      const found = (row.camposExtra || []).find((x) => x.campoKey === c.campoKey);
                      const key = `extra_${c.campoKey}`;
                      return (
                        <td
                          key={c.campoKey}
                          className="att-gestion-extra-col att-gestion-cell-clip"
                          style={colStyle(key)}
                          data-label={c.label}
                          title={displayCampoExtra(found)}
                        >
                          {displayCampoExtra(found)}
                        </td>
                      );
                    })}
                    <td className="att-gestion-actions-col" data-label="Acciones">
                      <div className="att-gestion-row-actions">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm att-gestion-action-btn"
                        title="Ver"
                        aria-label="Ver"
                        onClick={() => setDetailId(row.id)}
                      >
                        <IconEye />
                        <span className="att-gestion-action-btn__label">Ver</span>
                      </button>
                      {canEdit ? (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm att-gestion-action-btn"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => setEditRow(row)}
                        >
                          <IconPencil />
                          <span className="att-gestion-action-btn__label">Editar</span>
                        </button>
                      ) : null}
                      {canCreate ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm att-gestion-action-btn"
                          title="Duplicar"
                          aria-label="Duplicar"
                          onClick={() => setDuplicateRow(row)}
                        >
                          <IconCopy />
                          <span className="att-gestion-action-btn__label">Duplicar</span>
                        </button>
                      ) : null}
                      {canEdit && String(row.estado).toUpperCase() !== 'RETIRADO' ? (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm att-gestion-action-btn att-gestion-action-btn--text"
                          title="Retirar"
                          aria-label="Retirar"
                          onClick={() => setRetirarRow(row)}
                        >
                          <span className="att-gestion-action-btn__desk">Ret.</span>
                          <span className="att-gestion-action-btn__label">Retirar</span>
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm att-gestion-action-btn"
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => deleteInscripcion(row)}
                        >
                          <IconTrash />
                          <span className="att-gestion-action-btn__label">Eliminar</span>
                        </button>
                      ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 small">
          <span className="text-center text-sm-start">{meta.total || 0} registros</span>
          <div className="d-flex gap-2 align-items-center justify-content-center justify-content-sm-end">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span className="text-nowrap">
              Pág. {meta.page || page} / {meta.totalPages || 1}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= (meta.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
      </div>

      {detailId ? (
        <DetailModal
          id={detailId}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => setDetailId(null)}
          onEdit={(row) => {
            setDetailId(null);
            setEditRow(row);
          }}
          onDelete={(row) => deleteInscripcion(row)}
          onOpenFicha={(kind, documento) => setFicha({ kind, documento })}
        />
      ) : null}

      <InscripcionFormModal
        open={creating || Boolean(editRow)}
        initial={editRow}
        tiposOptions={tiposOptions}
        anioOptions={anioOptions}
        tipoFijo={
          editRow?.tipo != null
            ? Number(editRow.tipo)
            : tipoFijo != null
              ? tipoFijo
              : effectiveTipo
        }
        title={editRow ? 'Editar inscripción' : 'Nueva inscripción'}
        onClose={() => {
          setCreating(false);
          setEditRow(null);
        }}
        onSaved={invalidateList}
      />

      {duplicateRow ? (
        <DuplicarInscripcionModal
          source={duplicateRow}
          anioOptions={anioOptions}
          onClose={() => setDuplicateRow(null)}
          onSaved={invalidateList}
        />
      ) : null}

      {retirarRow ? (
        <RetirarModal
          row={retirarRow}
          onClose={() => setRetirarRow(null)}
          onSaved={invalidateList}
        />
      ) : null}

      {ficha?.documento ? (
        <FichaModal kind={ficha.kind} documento={ficha.documento} onClose={() => setFicha(null)} />
      ) : null}

      <SlideDrawer
        open={filtrosOpen}
        onClose={() => setFiltrosOpen(false)}
        eyebrow="Inscripciones"
        title="Filtros"
        subtitle={
          excludeTipo1
            ? 'Ajuste y pulse Aplicar. Tipo, estado y búsqueda siguen en la barra principal.'
            : 'Ajuste y pulse Aplicar. Mes, estado y búsqueda siguen en la barra y el panel izquierdo.'
        }
        width={420}
        footer={
          <div className="d-flex flex-wrap gap-2 justify-content-end w-100">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpiarFiltrosDrawer}>
              Limpiar
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setFiltrosOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={aplicarFiltrosDrawer}>
              Aplicar
            </button>
          </div>
        }
      >
        <DrawerSection title="Periodo y ubicación">
          <div className="mb-2">
            <label className="form-label small mb-1">Año</label>
            <SearchableSelect
              value={draftFiltros.anio}
              onChange={(v) => setDraftFiltros((p) => ({ ...p, anio: v || String(now.anio) }))}
              options={anioFilterOptions}
              allowClear={false}
            />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-1">Sede</label>
            <MultiSearchableSelect
              value={asFilterArray(draftFiltros.sede)}
              onChange={(v) => setDraftFiltros((p) => ({ ...p, sede: asFilterArray(v) }))}
              options={sedeOptions}
              placeholder="Todas"
            />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-1">Línea</label>
            <MultiSearchableSelect
              value={asFilterArray(draftFiltros.linea)}
              onChange={(v) => setDraftFiltros((p) => ({ ...p, linea: asFilterArray(v) }))}
              options={lineaOptions}
              placeholder="Todas"
            />
          </div>
        </DrawerSection>

        {!excludeTipo1 ? (
          <DrawerSection title="Curso">
            <div className="mb-2">
              <label className="form-label small mb-1">Actividad</label>
              <MultiSearchableSelect
                value={asFilterArray(draftFiltros.actividad)}
                onChange={(v) =>
                  setDraftFiltros((p) => ({
                    ...p,
                    actividad: asFilterArray(v),
                    idCursoFiltro: [],
                  }))
                }
                options={actividadOptions}
                placeholder="Todas…"
              />
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1">Categoría</label>
              <SearchableSelect
                value={asFilterArray(draftFiltros.idCursoFiltro)[0] || ''}
                onChange={(v) =>
                  setDraftFiltros((p) => ({
                    ...p,
                    idCursoFiltro: v ? [String(v)] : [],
                  }))
                }
                options={categoriaOptions.filter((o) => {
                  const draftActs = new Set(asFilterArray(draftFiltros.actividad).map(String));
                  if (!draftActs.size) return true;
                  if (!o.value) return true;
                  const actMap = new Map(
                    (metaQuery.data?.cursos || []).map((c) => [
                      String(c.id),
                      c.actividadId != null ? String(c.actividadId) : null,
                    ]),
                  );
                  const side = cursosSidebar.find((c) => String(c.id) === String(o.value));
                  const actId =
                    side?.actividad != null && String(side.actividad).trim() !== ''
                      ? String(side.actividad)
                      : actMap.get(String(o.value));
                  return draftActs.has(String(actId || ''));
                })}
                placeholder="Todas…"
              />
            </div>
          </DrawerSection>
        ) : null}

        <DrawerSection title="Fecha de inscripción">
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small mb-1">Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={draftFiltros.fechaDesde}
                max={draftFiltros.fechaHasta || undefined}
                onChange={(e) =>
                  setDraftFiltros((p) => ({ ...p, fechaDesde: e.target.value || '' }))
                }
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1">Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={draftFiltros.fechaHasta}
                min={draftFiltros.fechaDesde || undefined}
                onChange={(e) =>
                  setDraftFiltros((p) => ({ ...p, fechaHasta: e.target.value || '' }))
                }
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm px-0 mt-1"
            onClick={() => {
              const hoy = fechaHoyBogotaClient();
              setDraftFiltros((p) => ({
                ...p,
                fechaDesde: hoy,
                fechaHasta: hoy,
              }));
            }}
          >
            Solo hoy ({fechaHoyBogotaClient()})
          </button>
        </DrawerSection>
      </SlideDrawer>

      <GestionFab
        canCreate={canCreate}
        canExport
        exporting={exporting}
        exportDisabled={!listEnabled}
        newTitle="Nueva inscripción"
        onExport={exportExcel}
        onNew={() => {
          if (excludeTipo1 && !effectiveTipo) {
            showToast('danger', 'Seleccione un tipo antes de crear.');
            return;
          }
          setCreating(true);
        }}
      />

      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}

export function GestionCursosPage() {
  return (
    <GestionInscripcionesPage
      tipoFijo={1}
      showOtrosLink
    />
  );
}

export function GestionOtrosTiposPage() {
  return (
    <GestionInscripcionesPage
      tipoFijo={null}
      excludeTipo1
      showOtrosLink={false}
    />
  );
}
