import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { deleteJson, getJson, patchJson, postJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { SearchableSelect } from '../gestion/SearchableSelect.jsx';
import { SlideDrawer } from '../gestion/SlideDrawer.jsx';
import { anioMesBogotaClient } from '../../lib/gestionHelpers.js';

const SEDES = ['MEDELLÍN', 'RETIRO'];

const CURSO_SEDE = {
  '2351': 'MEDELLÍN',
  '2352': 'RETIRO',
  '2353': 'MEDELLÍN',
  '2354': 'RETIRO',
};

function foldSede(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Unifica variantes de sede y, si hace falta, deduce por ID de curso LVL UP. */
function normalizeSede(sede, idCurso) {
  const folded = foldSede(sede);
  if (folded.includes('RETIRO')) return 'RETIRO';
  if (folded.includes('MEDELL')) return 'MEDELLÍN';
  const fromCurso = CURSO_SEDE[String(idCurso || '').trim()];
  return fromCurso || 'MEDELLÍN';
}
const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

function horasDefaults(sesion, tipoPaquete) {
  const individual = sesion === 'Individual';
  const horasDiagnostico = individual ? '1' : '2';
  const horasInformeFinal = individual ? '1' : '2';
  let horasAsignadas = '';
  if (tipoPaquete === '8H') horasAsignadas = '8';
  else if (tipoPaquete === '16H') horasAsignadas = '16';
  return { horasAsignadas, horasDiagnostico, horasInformeFinal };
}

function emptyMaestro() {
  return {
    documento: '',
    nombre: '',
    correo: '',
    celular: '',
    sede: 'MEDELLÍN',
    areasAcademicas: '',
    escuelas: '',
    disponibilidad: '',
    nivel1: 'Si',
    dxNivel2: 'No',
    activo: true,
  };
}

function emptyGrupo(anio, mes) {
  return {
    codigo: '',
    nombre: '',
    sede: 'MEDELLÍN',
    idCurso: '',
    idAsignatura: '',
    anio: String(anio),
    mes: String(Number(mes)),
    estado: 'ACTIVO',
  };
}

function emptyAsignacion(anio, mes) {
  const sesion = 'Individual';
  const tipoPaquete = '8H';
  return {
    maestroId: '',
    sede: 'MEDELLÍN',
    idCurso: '',
    idAsignatura: '',
    sesion,
    grupoId: '',
    participante: '',
    anio: String(anio),
    mes: String(Number(mes)),
    tipoPaquete,
    ...horasDefaults(sesion, tipoPaquete),
    observaciones: '',
  };
}

/**
 * Panel admin LVL UP: maestros, grupos y asignaciones (listas + drawer).
 */
export function LvlupAdminTab() {
  const now = anioMesBogotaClient();
  const anioActual = now.anio;
  const mesActual = now.mesNum || Number(now.mes);

  const [tab, setTab] = useState('maestros');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMaestroId, setEditingMaestroId] = useState(null);
  const [editingGrupoId, setEditingGrupoId] = useState(null);
  const [editingAsignacionId, setEditingAsignacionId] = useState(null);
  const [maestroForm, setMaestroForm] = useState(emptyMaestro);
  const [grupoForm, setGrupoForm] = useState(() => emptyGrupo(anioActual, mesActual));
  const [asigForm, setAsigForm] = useState(() => emptyAsignacion(anioActual, mesActual));
  const [asigRecomendada, setAsigRecomendada] = useState(null);
  const [partSearch, setPartSearch] = useState('');
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    window.setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      type === 'danger' ? 3200 : 2600,
    );
  };

  const catalogosQuery = useQuery({
    queryKey: ['lvlup-admin-catalogos'],
    queryFn: () => getJson('/api/lvlup/admin/catalogos'),
    staleTime: 5 * 60_000,
  });

  const maestrosQuery = useQuery({
    queryKey: ['lvlup-admin-maestros'],
    queryFn: () => getJson('/api/lvlup/admin/maestros'),
  });

  const gruposQuery = useQuery({
    queryKey: ['lvlup-admin-grupos'],
    queryFn: () => getJson('/api/lvlup/admin/grupos'),
  });

  const asignacionesQuery = useQuery({
    queryKey: ['lvlup-admin-asignaciones'],
    queryFn: () => getJson('/api/lvlup/admin/asignaciones'),
  });

  const participantesQuery = useQuery({
    queryKey: ['lvlup-admin-participantes', asigForm.anio || anioActual, partSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('anio', String(asigForm.anio || anioActual));
      if (partSearch.trim()) params.set('q', partSearch.trim());
      return getJson(`/api/lvlup/admin/participantes?${params}`);
    },
    enabled: drawerOpen && tab === 'asignaciones' && asigForm.sesion === 'Individual',
    staleTime: 30_000,
  });

  const cursosAll = catalogosQuery.data?.cursos || [];

  const cursoNombreById = useMemo(() => {
    const map = new Map();
    for (const c of cursosAll) {
      map.set(String(c.id), c.nombre || String(c.id));
    }
    return map;
  }, [cursosAll]);

  const labelCurso = (idCurso) => {
    const id = String(idCurso || '').trim();
    if (!id) return '—';
    const nombre = cursoNombreById.get(id);
    return nombre ? nombre : id;
  };

  const cursosOptsForSede = (sede) => {
    const sedeNorm = foldSede(sede);
    return cursosAll
      .filter((c) => {
        if (!sedeNorm) return true;
        return foldSede(c.sede) === sedeNorm || CURSO_SEDE[String(c.id)] === normalizeSede(sede);
      })
      .map((c) => ({
        value: String(c.id),
        label: c.nombre
          ? `${c.nombre}${c.nivel ? ` · N${c.nivel}` : ''}`
          : `${c.id}${c.nivel ? ` · N${c.nivel}` : ''}`,
      }));
  };

  const cursosOptsGrupo = useMemo(
    () => cursosOptsForSede(grupoForm.sede),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helper usa cursosAll
    [cursosAll, grupoForm.sede],
  );
  const cursosOptsAsig = useMemo(
    () => cursosOptsForSede(asigForm.sede),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cursosAll, asigForm.sede],
  );

  const asigOpts = useMemo(() => {
    const rec = asigRecomendada != null ? String(asigRecomendada) : null;
    return (catalogosQuery.data?.asignaturas || []).map((a) => {
      const value = String(a.id);
      const base = a.nombre || value;
      return {
        value,
        label: rec && value === rec ? `${base} (recomendada)` : base,
      };
    });
  }, [catalogosQuery.data, asigRecomendada]);

  const maestroOpts = useMemo(
    () =>
      (maestrosQuery.data?.maestros || [])
        .filter((m) => m.activo)
        .map((m) => ({ value: String(m.id), label: `${m.nombre} (${m.documento})` })),
    [maestrosQuery.data],
  );
  const grupoOpts = useMemo(
    () =>
      (gruposQuery.data?.grupos || [])
        .filter((g) => g.estado === 'ACTIVO')
        .map((g) => ({
          value: String(g.id),
          label: `${g.nombre || g.codigo || g.id} · ${g.sede}`,
          sede: g.sede,
          idCurso: g.idCurso != null ? String(g.idCurso) : '',
          idAsignatura: g.idAsignatura != null ? String(g.idAsignatura) : '',
        })),
    [gruposQuery.data],
  );
  const partOpts = useMemo(
    () =>
      (participantesQuery.data?.participantes || []).map((p) => ({
        value: String(p.documento),
        label: `${p.nombre || p.documento} (${p.documento})`,
        searchText: `${p.nombre || ''} ${p.documento || ''}`,
        sede: p.sede || null,
        idCurso: p.idCurso ? String(p.idCurso) : '',
        idAsignatura: p.idAsignatura != null ? String(p.idAsignatura) : '',
      })),
    [participantesQuery.data],
  );

  const syncCursoConSede = (sede, idCurso) => {
    const valid = cursosOptsForSede(sede).some((o) => o.value === String(idCurso || ''));
    return valid ? String(idCurso) : '';
  };

  const onSedeAsigChange = (sede) => {
    const sedeN = normalizeSede(sede);
    setAsigForm((p) => ({
      ...p,
      sede: sedeN,
      idCurso: syncCursoConSede(sedeN, p.idCurso),
    }));
  };

  const onGrupoAsigChange = (grupoId, opt) => {
    const g =
      opt ||
      (gruposQuery.data?.grupos || []).find((x) => String(x.id) === String(grupoId));
    if (!g || !grupoId) {
      setAsigForm((p) => ({ ...p, grupoId: grupoId || '' }));
      setAsigRecomendada(null);
      return;
    }
    const idCurso = g.idCurso != null ? String(g.idCurso) : '';
    const sede = normalizeSede(g.sede, idCurso);
    const idAsignatura = g.idAsignatura != null ? String(g.idAsignatura) : '';
    setAsigRecomendada(idAsignatura || null);
    setAsigForm((p) => ({
      ...p,
      grupoId: String(grupoId),
      sede,
      idCurso: syncCursoConSede(sede, idCurso) || idCurso,
      idAsignatura,
    }));
  };

  const onParticipanteAsigChange = (documento, opt) => {
    const p =
      opt ||
      (participantesQuery.data?.participantes || []).find(
        (x) => String(x.documento) === String(documento),
      );
    if (!p || !documento) {
      setAsigForm((prev) => ({ ...prev, participante: documento || '' }));
      setAsigRecomendada(null);
      return;
    }
    const idCurso = p.idCurso ? String(p.idCurso) : '';
    const sede = normalizeSede(p.sede, idCurso);
    const idAsignatura = p.idAsignatura != null ? String(p.idAsignatura) : '';
    setAsigRecomendada(idAsignatura || null);
    setAsigForm((prev) => ({
      ...prev,
      participante: String(documento),
      sede,
      idCurso: syncCursoConSede(sede, idCurso) || idCurso,
      idAsignatura: idAsignatura || prev.idAsignatura,
    }));
  };

  const onSedeGrupoChange = (sede) => {
    const sedeN = normalizeSede(sede);
    setGrupoForm((p) => ({
      ...p,
      sede: sedeN,
      idCurso: syncCursoConSede(sedeN, p.idCurso),
    }));
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingMaestroId(null);
    setEditingGrupoId(null);
    setEditingAsignacionId(null);
    setAsigRecomendada(null);
    setPartSearch('');
  };

  const openNuevo = () => {
    if (tab === 'maestros') {
      setEditingMaestroId(null);
      setMaestroForm(emptyMaestro());
    } else if (tab === 'grupos') {
      setEditingGrupoId(null);
      setGrupoForm(emptyGrupo(anioActual, mesActual));
    } else {
      setEditingAsignacionId(null);
      setAsigForm(emptyAsignacion(anioActual, mesActual));
      setAsigRecomendada(null);
      setPartSearch('');
    }
    setDrawerOpen(true);
  };

  const saveMaestro = useMutation({
    mutationFn: ({ id, form }) => {
      const payload = {
        ...form,
        nivel1: form.nivel1 === 'Si' || form.nivel1 === true,
        dxNivel2: form.dxNivel2 === 'Si' ? 'Si' : 'No',
      };
      if (id) return patchJson(`/api/lvlup/admin/maestros/${id}`, payload);
      return postJson('/api/lvlup/admin/maestros', payload);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-maestros'] });
      queryClient.invalidateQueries({ queryKey: ['lvlup-maestros'] });
      showToast('success', vars?.toggle ? 'Estado actualizado' : 'Maestro guardado');
      if (!vars?.toggle) closeDrawer();
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar el maestro'),
  });

  const saveGrupo = useMutation({
    mutationFn: (form) => {
      const payload = {
        ...form,
        idAsignatura: Number(form.idAsignatura),
        anio: Number(form.anio),
        mes: Number(form.mes),
      };
      if (editingGrupoId) {
        return patchJson(`/api/lvlup/admin/grupos/${editingGrupoId}`, payload);
      }
      return postJson('/api/lvlup/admin/grupos', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-grupos'] });
      showToast('success', editingGrupoId ? 'Grupo actualizado' : 'Grupo creado');
      closeDrawer();
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar el grupo'),
  });

  const deleteGrupo = useMutation({
    mutationFn: (id) => deleteJson(`/api/lvlup/admin/grupos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-grupos'] });
      showToast('success', 'Grupo eliminado');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo eliminar el grupo'),
  });

  const deleteMaestro = useMutation({
    mutationFn: (id) => deleteJson(`/api/lvlup/admin/maestros/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-maestros'] });
      queryClient.invalidateQueries({ queryKey: ['lvlup-maestros'] });
      showToast('success', 'Maestro eliminado');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo eliminar el maestro'),
  });

  const saveAsig = useMutation({
    mutationFn: (form) => {
      const payload = {
        ...form,
        maestroId: Number(form.maestroId),
        idAsignatura: Number(form.idAsignatura),
        grupoId: form.sesion === 'Grupal' ? Number(form.grupoId) : null,
        participante: form.sesion === 'Individual' ? form.participante : null,
        anio: Number(form.anio),
        mes: Number(form.mes),
      };
      if (editingAsignacionId) {
        return patchJson(`/api/lvlup/admin/asignaciones/${editingAsignacionId}`, payload);
      }
      return postJson('/api/lvlup/admin/asignaciones', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['lvlup-asignaciones'] });
      showToast(
        'success',
        editingAsignacionId ? 'Asignación actualizada' : 'Asignación creada',
      );
      closeDrawer();
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar la asignación'),
  });

  const deleteAsig = useMutation({
    mutationFn: (id) => deleteJson(`/api/lvlup/admin/asignaciones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['lvlup-asignaciones'] });
      showToast('success', 'Asignación eliminada');
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo eliminar la asignación'),
  });

  const patchAsigEstado = useMutation({
    mutationFn: ({ id, estado }) => patchJson(`/api/lvlup/admin/asignaciones/${id}`, { estado }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lvlup-admin-asignaciones'] });
      queryClient.invalidateQueries({ queryKey: ['lvlup-asignaciones'] });
      showToast(
        'success',
        vars?.estado === 'FINALIZADO' ? 'Asignación finalizada' : 'Estado actualizado',
      );
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo cambiar el estado'),
  });

  const openEditAsignacion = (a) => {
    setEditingAsignacionId(a.id);
    setAsigRecomendada(a.idAsignatura != null ? String(a.idAsignatura) : null);
    setAsigForm({
      maestroId: a.maestroId != null ? String(a.maestroId) : '',
      sede: a.sede || 'MEDELLÍN',
      idCurso: a.idCurso ? String(a.idCurso) : '',
      idAsignatura: a.idAsignatura != null ? String(a.idAsignatura) : '',
      sesion: a.sesion || 'Individual',
      grupoId: a.grupoId != null ? String(a.grupoId) : '',
      participante: a.participante || '',
      anio: String(a.anio || anioActual),
      mes: String(Number(a.mes) || mesActual),
      tipoPaquete: a.tipoPaquete || '8H',
      horasAsignadas: a.horasAsignadas != null ? String(a.horasAsignadas) : '',
      horasDiagnostico: a.horasDiagnostico != null ? String(a.horasDiagnostico) : '0',
      horasInformeFinal: a.horasInformeFinal != null ? String(a.horasInformeFinal) : '0',
      observaciones: a.observaciones || '',
      estado: a.estado || 'ACTIVO',
    });
    setPartSearch('');
    setDrawerOpen(true);
  };

  const applySesionPaquete = (next) => {
    if (next.sesion != null && next.sesion !== asigForm.sesion) {
      setAsigRecomendada(null);
    }
    setAsigForm((p) => {
      const sesion = next.sesion ?? p.sesion;
      const tipoPaquete = next.tipoPaquete ?? p.tipoPaquete;
      const cleared =
        next.sesion && next.sesion !== p.sesion
          ? { grupoId: '', participante: '', idAsignatura: '' }
          : {};
      return { ...p, ...next, ...cleared, ...horasDefaults(sesion, tipoPaquete) };
    });
  };

  const maestros = maestrosQuery.data?.maestros || [];
  const grupos = gruposQuery.data?.grupos || [];
  const asignaciones = asignacionesQuery.data?.asignaciones || [];

  const drawerTitle =
    tab === 'maestros'
      ? editingMaestroId
        ? 'Editar maestro'
        : 'Nuevo maestro'
      : tab === 'grupos'
        ? editingGrupoId
          ? 'Editar grupo'
          : 'Nuevo grupo'
        : editingAsignacionId
          ? 'Editar asignación'
          : 'Nueva asignación';

  const formError =
    (tab === 'maestros' && saveMaestro.isError && saveMaestro.error?.message) ||
    (tab === 'grupos' && saveGrupo.isError && saveGrupo.error?.message) ||
    (tab === 'asignaciones' && saveAsig.isError && saveAsig.error?.message) ||
    '';

  const drawerFooter = (
    <>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeDrawer}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={
          (tab === 'maestros' && saveMaestro.isPending) ||
          (tab === 'grupos' && saveGrupo.isPending) ||
          (tab === 'asignaciones' && saveAsig.isPending)
        }
        onClick={() => {
          if (tab === 'maestros') saveMaestro.mutate({ id: editingMaestroId, form: maestroForm });
          else if (tab === 'grupos') saveGrupo.mutate(grupoForm);
          else saveAsig.mutate(asigForm);
        }}
      >
        Guardar
      </button>
    </>
  );

  return (
    <div className="att-lvlup-admin">
      <div className="att-lvlup-admin__toolbar">
        <div className="att-tabs" role="tablist">
          {[
            { id: 'maestros', label: 'Maestros' },
            { id: 'grupos', label: 'Grupos' },
            { id: 'asignaciones', label: 'Asignaciones' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`att-tab-btn ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => {
                setTab(t.id);
                closeDrawer();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openNuevo}>
          {tab === 'maestros' ? 'Nuevo maestro' : tab === 'grupos' ? 'Nuevo grupo' : 'Nueva asignación'}
        </button>
      </div>

      {tab === 'maestros' ? (
        <div className="att-lvlup-admin__list">
          <div className="att-lvlup-admin__table-wrap">
            <table className="table table-sm att-history-table att-lvlup-admin__table mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Correo</th>
                  <th>Sede</th>
                  <th>Activo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {maestros.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nombre}</td>
                    <td>{m.documento}</td>
                    <td>{m.correo}</td>
                    <td>{m.sede || '—'}</td>
                    <td>{m.activo ? 'Sí' : 'No'}</td>
                    <td className="text-nowrap text-end">
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0"
                        onClick={() => {
                          setEditingMaestroId(m.id);
                          setMaestroForm({
                            documento: m.documento || '',
                            nombre: m.nombre || '',
                            correo: m.correo || '',
                            celular: m.celular || '',
                            sede: m.sede || 'MEDELLÍN',
                            areasAcademicas: m.areasAcademicas || '',
                            escuelas: m.escuelas || '',
                            disponibilidad: m.disponibilidad || '',
                            nivel1: m.nivel1 ? 'Si' : 'No',
                            dxNivel2: m.dxNivel2 || 'No',
                            activo: Boolean(m.activo),
                          });
                          setDrawerOpen(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0 text-danger"
                        onClick={() => {
                          saveMaestro.mutate({
                            id: m.id,
                            toggle: true,
                            form: {
                              documento: m.documento,
                              nombre: m.nombre,
                              correo: m.correo,
                              celular: m.celular,
                              sede: m.sede,
                              areasAcademicas: m.areasAcademicas || '',
                              escuelas: m.escuelas || '',
                              disponibilidad: m.disponibilidad || '',
                              nivel1: m.nivel1 ? 'Si' : 'No',
                              dxNivel2: m.dxNivel2 || 'No',
                              activo: !m.activo,
                            },
                          });
                        }}
                      >
                        {m.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0 text-danger"
                        disabled={deleteMaestro.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar al maestro «${m.nombre}»? Solo si no tiene asignaciones.`,
                            )
                          ) {
                            deleteMaestro.mutate(m.id);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'grupos' ? (
        <div className="att-lvlup-admin__list">
          <div className="att-lvlup-admin__table-wrap">
            <table className="table table-sm att-history-table att-lvlup-admin__table mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Sede</th>
                  <th>Curso</th>
                  <th>Asignatura</th>
                  <th>Periodo</th>
                  <th>Inscritos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.id}>
                    <td>{g.nombre || g.codigo || g.id}</td>
                    <td>{g.sede}</td>
                    <td className="att-gestion-cell-clip" title={labelCurso(g.idCurso)}>
                      {labelCurso(g.idCurso)}
                    </td>
                    <td className="att-gestion-cell-clip" title={g.nombreAsignatura || ''}>
                      {g.nombreAsignatura || g.idAsignatura}
                    </td>
                    <td>
                      {g.anio}-{String(g.mes).padStart(2, '0')}
                    </td>
                    <td>{g.inscritos ?? 0}</td>
                    <td>{g.estado}</td>
                    <td className="text-nowrap text-end">
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0"
                        onClick={() => {
                          setEditingGrupoId(g.id);
                          setGrupoForm({
                            codigo: g.codigo || '',
                            nombre: g.nombre || '',
                            sede: g.sede || 'MEDELLÍN',
                            idCurso: g.idCurso ? String(g.idCurso) : '',
                            idAsignatura: g.idAsignatura != null ? String(g.idAsignatura) : '',
                            anio: String(g.anio || anioActual),
                            mes: String(Number(g.mes) || mesActual),
                            estado: g.estado || 'ACTIVO',
                          });
                          setDrawerOpen(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0 text-danger"
                        disabled={deleteGrupo.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar el grupo «${g.nombre || g.codigo || g.id}»? Solo si no tiene asignaciones ni inscritos.`,
                            )
                          ) {
                            deleteGrupo.mutate(g.id);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'asignaciones' ? (
        <div className="att-lvlup-admin__list">
          <div className="att-lvlup-admin__table-wrap">
            <table className="table table-sm att-history-table att-lvlup-admin__table mb-0">
              <thead>
                <tr>
                  <th>Maestro</th>
                  <th>Sesión</th>
                  <th>Detalle</th>
                  <th>Paquete</th>
                  <th>Horas</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {asignaciones.map((a) => (
                  <tr key={a.id}>
                    <td>{a.maestroNombre || a.maestroId}</td>
                    <td>{a.sesion}</td>
                    <td>
                      {a.sesion === 'Grupal' ? a.grupoNombre || a.grupoId : a.participante || '—'}
                      <div className="small text-muted">
                        {a.nombreAsignatura || a.idAsignatura} · {a.sede}
                      </div>
                    </td>
                    <td>{a.tipoPaquete}</td>
                    <td className="small text-nowrap">
                      {a.horasAsignadas ?? '—'} / {a.horasDiagnostico ?? 0} / {a.horasInformeFinal ?? 0}
                    </td>
                    <td>{a.estado}</td>
                    <td className="text-nowrap text-end">
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0"
                        onClick={() => openEditAsignacion(a)}
                      >
                        Editar
                      </button>
                      {a.estado === 'ACTIVO' ? (
                        <button
                          type="button"
                          className="btn btn-link btn-sm py-0"
                          onClick={() => patchAsigEstado.mutate({ id: a.id, estado: 'FINALIZADO' })}
                        >
                          Finalizar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-link btn-sm py-0 text-danger"
                        disabled={deleteAsig.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              '¿Eliminar esta asignación? Solo si no tiene asistencias registradas.',
                            )
                          ) {
                            deleteAsig.mutate(a.id);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <SlideDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerTitle}
        width={440}
        footer={drawerFooter}
      >
        {formError ? <div className="text-danger small mb-2">{formError}</div> : null}

        {tab === 'maestros' ? (
          <div className="row g-2">
            {[
              ['documento', 'Documento'],
              ['nombre', 'Nombre'],
              ['correo', 'Correo'],
              ['celular', 'Celular'],
            ].map(([k, label]) => (
              <div key={k} className="col-12">
                <label className="form-label small mb-0">{label}</label>
                <input
                  className="form-control form-control-sm"
                  value={maestroForm[k] || ''}
                  onChange={(e) => setMaestroForm((p) => ({ ...p, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="col-12">
              <label className="form-label small mb-0">Sede</label>
              <SearchableSelect
                value={maestroForm.sede}
                onChange={(v) => setMaestroForm((p) => ({ ...p, sede: v }))}
                options={SEDES.map((s) => ({ value: s, label: s }))}
                allowClear={false}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Áreas académicas</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={maestroForm.areasAcademicas}
                onChange={(e) => setMaestroForm((p) => ({ ...p, areasAcademicas: e.target.value }))}
                placeholder="Ej. Matemáticas, Lectura…"
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Escuelas</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={maestroForm.escuelas}
                onChange={(e) => setMaestroForm((p) => ({ ...p, escuelas: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Disponibilidad</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={maestroForm.disponibilidad}
                onChange={(e) => setMaestroForm((p) => ({ ...p, disponibilidad: e.target.value }))}
                placeholder="Horarios / días…"
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-0">Nivel 1</label>
              <SearchableSelect
                value={maestroForm.nivel1}
                onChange={(v) => setMaestroForm((p) => ({ ...p, nivel1: v }))}
                options={[
                  { value: 'Si', label: 'Sí' },
                  { value: 'No', label: 'No' },
                ]}
                allowClear={false}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-0">Nivel 2 (Dx)</label>
              <SearchableSelect
                value={maestroForm.dxNivel2}
                onChange={(v) => setMaestroForm((p) => ({ ...p, dxNivel2: v }))}
                options={[
                  { value: 'No', label: 'No' },
                  { value: 'Si', label: 'Sí' },
                ]}
                allowClear={false}
              />
            </div>
          </div>
        ) : null}

        {tab === 'grupos' ? (
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label small mb-0">Nombre</label>
              <input
                className="form-control form-control-sm"
                value={grupoForm.nombre}
                onChange={(e) => setGrupoForm((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Código</label>
              <input
                className="form-control form-control-sm"
                value={grupoForm.codigo}
                onChange={(e) => setGrupoForm((p) => ({ ...p, codigo: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Sede</label>
              <SearchableSelect
                value={grupoForm.sede}
                onChange={onSedeGrupoChange}
                options={SEDES.map((s) => ({ value: s, label: s }))}
                allowClear={false}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Curso</label>
              <SearchableSelect
                value={grupoForm.idCurso}
                onChange={(v) => setGrupoForm((p) => ({ ...p, idCurso: v }))}
                options={cursosOptsGrupo}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Asignatura</label>
              <SearchableSelect
                value={grupoForm.idAsignatura}
                onChange={(v) => setGrupoForm((p) => ({ ...p, idAsignatura: v }))}
                options={asigOpts}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-0">Año</label>
              <input
                className="form-control form-control-sm"
                value={grupoForm.anio}
                onChange={(e) => setGrupoForm((p) => ({ ...p, anio: e.target.value }))}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-0">Mes</label>
              <SearchableSelect
                value={grupoForm.mes}
                onChange={(v) => setGrupoForm((p) => ({ ...p, mes: v }))}
                options={MESES}
                allowClear={false}
              />
            </div>
            {editingGrupoId ? (
              <div className="col-12">
                <label className="form-label small mb-0">Estado</label>
                <SearchableSelect
                  value={grupoForm.estado}
                  onChange={(v) => setGrupoForm((p) => ({ ...p, estado: v }))}
                  options={[
                    { value: 'ACTIVO', label: 'ACTIVO' },
                    { value: 'CERRADO', label: 'CERRADO' },
                  ]}
                  allowClear={false}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'asignaciones' ? (
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label small mb-0">Maestro</label>
              <SearchableSelect
                value={asigForm.maestroId}
                onChange={(v) => setAsigForm((p) => ({ ...p, maestroId: v }))}
                options={maestroOpts}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Sesión</label>
              <SearchableSelect
                value={asigForm.sesion}
                onChange={(v) => applySesionPaquete({ sesion: v })}
                options={[
                  { value: 'Individual', label: 'Individual' },
                  { value: 'Grupal', label: 'Grupal' },
                ]}
                allowClear={false}
              />
            </div>
            {asigForm.sesion === 'Grupal' ? (
              <div className="col-12">
                <label className="form-label small mb-0">Grupo</label>
                <SearchableSelect
                  value={asigForm.grupoId}
                  onChange={onGrupoAsigChange}
                  options={grupoOpts}
                />
              </div>
            ) : (
              <div className="col-12">
                <label className="form-label small mb-0">
                  Participante LVL UP ({asigForm.anio || anioActual})
                </label>
                <SearchableSelect
                  value={asigForm.participante}
                  onChange={onParticipanteAsigChange}
                  options={partOpts}
                  onSearchChange={setPartSearch}
                  placeholder="Buscar por nombre o documento…"
                />
              </div>
            )}
            <div className="col-12">
              <label className="form-label small mb-0">Sede</label>
              <SearchableSelect
                value={asigForm.sede}
                onChange={onSedeAsigChange}
                options={SEDES.map((s) => ({ value: s, label: s }))}
                allowClear={false}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Curso</label>
              <SearchableSelect
                value={asigForm.idCurso}
                onChange={(v) => setAsigForm((p) => ({ ...p, idCurso: v }))}
                options={cursosOptsAsig}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Asignatura</label>
              <SearchableSelect
                value={asigForm.idAsignatura}
                onChange={(v) => setAsigForm((p) => ({ ...p, idAsignatura: v }))}
                options={asigOpts}
              />
            </div>
            <div className="col-12">
              <label className="form-label small mb-0">Paquete</label>
              <SearchableSelect
                value={asigForm.tipoPaquete}
                onChange={(v) => applySesionPaquete({ tipoPaquete: v })}
                options={[
                  { value: '8H', label: '8H' },
                  { value: '16H', label: '16H' },
                ]}
                allowClear={false}
              />
            </div>
            <div className="col-4">
              <label className="form-label small mb-0">Horas asignadas</label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                value={asigForm.horasAsignadas}
                onChange={(e) => setAsigForm((p) => ({ ...p, horasAsignadas: e.target.value }))}
              />
            </div>
            <div className="col-4">
              <label className="form-label small mb-0">Diagnóstico</label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                value={asigForm.horasDiagnostico}
                onChange={(e) => setAsigForm((p) => ({ ...p, horasDiagnostico: e.target.value }))}
              />
            </div>
            <div className="col-4">
              <label className="form-label small mb-0">Informe final</label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                value={asigForm.horasInformeFinal}
                onChange={(e) => setAsigForm((p) => ({ ...p, horasInformeFinal: e.target.value }))}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-0">Año</label>
              <input
                className="form-control form-control-sm"
                value={asigForm.anio}
                onChange={(e) => setAsigForm((p) => ({ ...p, anio: e.target.value }))}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-0">Mes</label>
              <SearchableSelect
                value={asigForm.mes}
                onChange={(v) => setAsigForm((p) => ({ ...p, mes: v }))}
                options={MESES}
                allowClear={false}
              />
            </div>
            {editingAsignacionId ? (
              <div className="col-12">
                <label className="form-label small mb-0">Estado</label>
                <SearchableSelect
                  value={asigForm.estado || 'ACTIVO'}
                  onChange={(v) => setAsigForm((p) => ({ ...p, estado: v }))}
                  options={[
                    { value: 'ACTIVO', label: 'ACTIVO' },
                    { value: 'PAUSADO', label: 'PAUSADO' },
                    { value: 'FINALIZADO', label: 'FINALIZADO' },
                  ]}
                  allowClear={false}
                />
              </div>
            ) : null}
            <div className="col-12">
              <label className="form-label small mb-0">Observaciones</label>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                value={asigForm.observaciones}
                onChange={(e) => setAsigForm((p) => ({ ...p, observaciones: e.target.value }))}
              />
            </div>
          </div>
        ) : null}
      </SlideDrawer>

      {toast.show ? (
        <div
          className={`att-toast att-toast--${toast.type === 'danger' ? 'error' : 'success'}`}
          role="status"
        >
          <div className="att-toast__icon" aria-hidden="true">
            {toast.type === 'danger' ? '!' : '✓'}
          </div>
          <p className="att-toast__text">{toast.message}</p>
          <button
            type="button"
            className="att-toast__close"
            aria-label="Cerrar"
            onClick={() => setToast((t) => ({ ...t, show: false }))}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
