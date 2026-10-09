import { useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getJson, postJson } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getDefaultAppPath, isAdminLike, isNavKeyEnabled } from '../../lib/navFeatures.js';
import { canGestion, useGestionPermisos } from '../../lib/useGestionPermisos.js';
import { loadGestionFilters, saveGestionFilters } from '../../lib/gestionFiltersStorage.js';
import { normalizeForSearch } from '../../lib/normalizeSearch.js';
import { GestionNav } from '../../components/gestion/GestionNav.jsx';
import { GestionFab } from '../../components/gestion/GestionFab.jsx';
import { GestionPanelModeToggle } from '../../components/gestion/GestionPanel.jsx';
import { SearchableSelect } from '../../components/gestion/SearchableSelect.jsx';
import { GestionSearchInput } from '../../components/gestion/GestionSearchInput.jsx';
import { AttToast, useAttToast } from '../../components/AttToast.jsx';
import { exportRowsToExcel } from '../../lib/exportExcel.js';

const FILTER_KEY = 'att-gestion-recomendaciones-filters';

function rowKey(row) {
  return `${row.validador}:${row.idCurso}`;
}

/**
 * Valor del selector = nombre recomendado (texto posterior).
 * Si hay ID guardado, se muestra el nombre de la opción / posterior del curso destino,
 * nunca el nombre "actual" convencional salvo que no haya otra referencia.
 */
function effectiveNombre(row, drafts) {
  const key = rowKey(row);
  if (Object.prototype.hasOwnProperty.call(drafts, key)) {
    return drafts[key] || '';
  }
  if (row.cursoRecomendado) {
    const opt = (row.opcionesRecomendadas || []).find(
      (o) => String(o.id) === String(row.cursoRecomendado),
    );
    if (opt?.nombre) return String(opt.nombre).trim();
  }
  if (row.nombreCursoRecomendado) return String(row.nombreCursoRecomendado).trim();
  const def =
    row.cursoRecomendadoDefaultNombre ||
    row.cursoPosteriorDefault ||
    '';
  return String(def).trim();
}

function storedNombre(row) {
  if (row.cursoRecomendado) {
    const opt = (row.opcionesRecomendadas || []).find(
      (o) => String(o.id) === String(row.cursoRecomendado),
    );
    if (opt?.nombre) return String(opt.nombre).trim();
  }
  if (row.nombreCursoRecomendado) return String(row.nombreCursoRecomendado).trim();
  return '';
}

function buildSelectOptions(row) {
  const seen = new Set();
  const out = [];
  const push = (nombre, id = null) => {
    const label = String(nombre || '').trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      value: label,
      label,
      searchText: `${label} ${id || ''}`,
    });
  };

  for (const o of row.opcionesRecomendadas || []) {
    push(o.nombre || o.value || o.label, o.id);
  }
  push(row.cursoPosteriorDefault || row.cursoRecomendadoDefaultNombre);
  push(row.nombreCursoRecomendado, row.cursoRecomendado);

  const preferred =
    storedNombre(row) ||
    String(row.cursoPosteriorDefault || row.cursoRecomendadoDefaultNombre || '').trim();
  if (preferred) {
    const idx = out.findIndex((o) => o.value.toLowerCase() === preferred.toLowerCase());
    if (idx > 0) {
      const [item] = out.splice(idx, 1);
      out.unshift(item);
    }
  }
  return out;
}

export function GestionRecomendacionesPage() {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const canEdit = canGestion(permisosQuery.data, 'recomendaciones', 'editar');

  const savedFilters = useMemo(
    () =>
      loadGestionFilters(FILTER_KEY, {
        actividad: '',
        idCurso: '',
        anio: String(new Date().getFullYear()),
      }),
    [],
  );

  const [actividad, setActividad] = useState(() => String(savedFilters.actividad || ''));
  const [idCurso, setIdCurso] = useState(() => String(savedFilters.idCurso || ''));
  const [anio, setAnio] = useState(() => String(savedFilters.anio || new Date().getFullYear()));
  const [participanteQ, setParticipanteQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const [drafts, setDrafts] = useState({});
  const { toast, showToast, setToast } = useAttToast();

  useEffect(() => {
    saveGestionFilters(FILTER_KEY, { actividad, idCurso, anio });
  }, [actividad, idCurso, anio]);

  const actQuery = useQuery({
    queryKey: ['gestion-catalog-actividades'],
    queryFn: () => getJson('/api/gestion/catalogos/actividades'),
    staleTime: 5 * 60_000,
    enabled: isAdminLike(user),
  });

  const cursosQuery = useQuery({
    queryKey: ['gestion-cursos-recom', actividad],
    queryFn: () => {
      const u = new URLSearchParams();
      u.set('soloActivos', 'false');
      u.set('tipo', '1');
      if (actividad) u.set('actividad', actividad);
      return getJson(`/api/gestion/cursos?${u.toString()}`);
    },
    enabled: isAdminLike(user) && Boolean(actividad),
    staleTime: 60_000,
  });

  const listParams = useMemo(() => {
    const u = new URLSearchParams();
    if (actividad) u.set('actividad', actividad);
    if (idCurso) u.set('idCurso', idCurso);
    if (anio) u.set('anio', anio);
    return u.toString();
  }, [actividad, idCurso, anio]);

  const listEnabled = Boolean(actividad || idCurso);

  const query = useQuery({
    queryKey: ['gestion-recomendaciones', listParams],
    queryFn: () => getJson(`/api/gestion/recomendaciones?${listParams}`),
    enabled: isAdminLike(user) && listEnabled,
    staleTime: 30_000,
  });

  useEffect(() => {
    setDrafts({});
  }, [listParams]);

  const saveMut = useMutation({
    mutationFn: (items) =>
      postJson('/api/gestion/recomendaciones/guardar', {
        items,
        anio: anio ? Number(anio) : undefined,
      }),
    onSuccess: async (data) => {
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: ['gestion-recomendaciones'] });
      const skipped = data?.skipped?.length || 0;
      if (skipped) {
        showToast(
          'warning',
          `Guardado parcial: ${skipped} sin curso destino (el nombre aún no existe como curso)`,
        );
      } else {
        showToast('success', 'Recomendaciones guardadas');
      }
    },
    onError: (err) => showToast('danger', err?.message || 'No se pudo guardar'),
  });

  const filas = query.data?.filas || [];

  const filasFiltradas = useMemo(() => {
    const nq = normalizeForSearch(participanteQ);
    if (!nq) return filas;
    return filas.filter((row) =>
      normalizeForSearch(
        `${row.nombreParticipante || ''} ${row.validador || ''}`,
      ).includes(nq),
    );
  }, [filas, participanteQ]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const row of filas) {
      const next = effectiveNombre(row, drafts) || '';
      const stored = storedNombre(row);
      if (String(next) !== String(stored || '')) n += 1;
    }
    return n;
  }, [filas, drafts]);

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  const actividadOptions = (actQuery.data?.actividades || []).map((a) => ({
    value: String(a.id),
    label: a.nombre || String(a.id),
  }));

  const cursoOptions = (cursosQuery.data?.cursos || []).map((c) => ({
    value: String(c.id),
    label: `${c.nombre || c.id} (${c.id})`,
  }));

  const handleRecomendadoChange = (row, value) => {
    const key = rowKey(row);
    setDrafts((prev) => ({ ...prev, [key]: value || '' }));
  };

  const handleGuardar = () => {
    const items = filas
      .map((row) => {
        const nextNombre = effectiveNombre(row, drafts) || null;
        const stored = storedNombre(row) || null;
        const isDefaultPending =
          !stored &&
          nextNombre &&
          !Object.prototype.hasOwnProperty.call(drafts, rowKey(row));
        if (!isDefaultPending && String(nextNombre || '') === String(stored || '')) {
          return null;
        }
        if (!nextNombre) {
          return {
            validador: row.validador,
            idCurso: row.idCurso,
            cursoRecomendado: null,
          };
        }
        return {
          validador: row.validador,
          idCurso: row.idCurso,
          cursoRecomendado: nextNombre,
        };
      })
      .filter(Boolean);

    if (!items.length) {
      showToast('warning', 'No hay cambios para guardar');
      return;
    }
    saveMut.mutate(items);
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      await exportRowsToExcel({
        rows: filasFiltradas.map((row) => {
          const nombre = effectiveNombre(row, drafts);
          const opt = (row.opcionesRecomendadas || []).find(
            (o) => String(o.nombre).toLowerCase() === String(nombre).toLowerCase(),
          );
          return {
            ...row,
            cursoRecomendadoNombre: nombre || '',
            cursoRecomendadoId: opt?.id || row.cursoRecomendado || '',
          };
        }),
        sheetName: 'Recomendaciones',
        fileNamePrefix: 'recomendaciones_tipo1',
        columns: [
          { key: 'validador', header: 'Documento' },
          { key: 'nombreParticipante', header: 'Participante' },
          { key: 'nombreCurso', header: 'Curso actual' },
          { key: 'idCurso', header: 'ID curso actual' },
          { key: 'sede', header: 'Sede' },
          { key: 'cursoRecomendadoNombre', header: 'Curso posterior' },
          { key: 'cursoRecomendadoId', header: 'ID curso posterior' },
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
        <div className="col-12 col-md-3">
          <label className="form-label small mb-1">Disciplina (actividad)</label>
          <SearchableSelect
            value={actividad}
            onChange={(v) => {
              setActividad(v);
              setIdCurso('');
            }}
            options={actividadOptions}
            placeholder="Seleccione actividad…"
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label small mb-1">Curso</label>
          <SearchableSelect
            value={idCurso}
            onChange={setIdCurso}
            options={cursoOptions}
            placeholder={actividad ? 'Todos los cursos…' : 'Seleccione actividad primero'}
            disabled={!actividad}
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small mb-1">Año</label>
          <input
            className="form-control form-control-sm"
            inputMode="numeric"
            value={anio}
            onChange={(e) => setAnio(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1">Participante</label>
          <GestionSearchInput
            placeholder="Buscar por nombre o documento…"
            value={participanteQ}
            onChange={(e) => setParticipanteQ(e.target.value)}
          />
        </div>
      </div>

      {!listEnabled ? (
        <p className="text-muted small">Seleccione al menos una actividad o curso para ver participantes.</p>
      ) : null}

      {dirtyCount > 0 ? (
        <p className="small text-primary mb-2">{dirtyCount} cambio(s) sin guardar</p>
      ) : null}

      {query.isError ? <div className="alert alert-danger small">{query.error?.message}</div> : null}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive att-admin-table-wrap--mobile-safe">
          <table className="table table-sm table-hover mb-0 att-admin-table att-gestion-table">
            <thead className="att-sortable-head">
              <tr>
                <th>Participante</th>
                <th>Curso actual</th>
                <th>Curso recomendado</th>
              </tr>
            </thead>
            <tbody>
              {!listEnabled ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">
                    Use los filtros para cargar participantes tipo 1
                  </td>
                </tr>
              ) : null}
              {listEnabled && query.isPending ? (
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </td>
                </tr>
              ) : null}
              {listEnabled && !query.isPending && filasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">
                    {filas.length
                      ? 'Sin coincidencias para la búsqueda'
                      : 'Sin participantes para los filtros seleccionados'}
                  </td>
                </tr>
              ) : null}
              {filasFiltradas.map((row) => {
                const key = rowKey(row);
                const selectOptions = buildSelectOptions(row);
                const rawSelected = effectiveNombre(row, drafts);
                const matched = selectOptions.find(
                  (o) => o.value.toLowerCase() === String(rawSelected).toLowerCase(),
                );
                const selectedValue = matched?.value || rawSelected || '';
                return (
                  <tr key={key}>
                    <td data-label="Participante">
                      <div className="fw-semibold">{row.nombreParticipante}</div>
                      <div className="small text-muted">{row.validador}</div>
                    </td>
                    <td data-label="Curso actual">
                      <div>{row.nombreCurso}</div>
                      <div className="small text-muted">{row.idCurso}</div>
                    </td>
                    <td data-label="Curso recomendado" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <SearchableSelect
                          value={selectedValue}
                          onChange={(v) => handleRecomendadoChange(row, v)}
                          options={selectOptions}
                          placeholder="Seleccione…"
                        />
                      ) : (
                        selectedValue || '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <GestionFab
        canCreate={false}
        canSave={canEdit}
        canExport
        saving={saveMut.isPending}
        saveDisabled={dirtyCount === 0 || saveMut.isPending}
        saveTitle={dirtyCount ? `Guardar (${dirtyCount})` : 'Guardar'}
        onSave={handleGuardar}
        exporting={exporting}
        exportDisabled={!filasFiltradas.length}
        onExport={exportExcel}
      />

      <AttToast toast={toast} onClose={() => setToast((t) => ({ ...t, show: false }))} />
    </div>
  );
}
