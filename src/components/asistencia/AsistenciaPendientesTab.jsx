import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api.js';

const SEDES = [
  { value: '', label: 'Todas las sedes' },
  { value: 'MEDELLÍN', label: 'MEDELLÍN' },
  { value: 'RETIRO', label: 'RETIRO' },
];

/**
 * Listado para gestores: cursos Tipo=1 con clase hoy que aún no han tomado asistencia.
 * Estilos alineados con Historial / Información (`att-history-table--enhanced`).
 */
export function AsistenciaPendientesTab() {
  const [sede, setSede] = useState('');
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: ['asistencia-cursos-sin-hoy', sede],
    queryFn: () => {
      const params = new URLSearchParams();
      if (sede) params.set('sede', sede);
      const qs = params.toString();
      return getJson(`/api/asistencia/cursos-sin-hoy${qs ? `?${qs}` : ''}`);
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const cursos = query.data?.cursos || [];
  const fecha = query.data?.fecha || '';
  const dia = query.data?.dia || '';

  const filtrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cursos;
    return cursos.filter((c) => {
      const blob = `${c.nombre || ''} ${c.nombreCorto || ''} ${c.sede || ''} ${c.docente || ''}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [cursos, q]);

  return (
    <div className="att-pendientes">
      <div className="att-info-toolbar d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 160 }}
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            aria-label="Filtrar por sede"
          >
            {SEDES.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ width: 240 }}
            placeholder="Buscar curso, sede, docente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="small text-muted">
            {fecha ? `${fecha}${dia ? ` · ${dia}` : ''}` : ''}
            {query.isPending
              ? ''
              : ` · ${filtrados.length}${filtrados.length !== cursos.length ? ` / ${cursos.length}` : ''} pendientes`}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          {query.isFetching ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {query.isPending ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : query.isError ? (
        <div className="alert alert-danger small">{query.error?.message || 'No se pudo cargar'}</div>
      ) : (
        <div className="table-responsive att-info-table-wrap">
          <table className="table table-sm align-middle att-history-table att-history-table--enhanced">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Sede</th>
                <th>Docente</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">
                    {cursos.length === 0
                      ? 'Todos los cursos de hoy ya tienen asistencia registrada.'
                      : 'Ningún resultado con ese filtro.'}
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => (
                  <tr key={c.idCurso}>
                    <td data-label="Curso">{c.nombre || '—'}</td>
                    <td data-label="Sede">{c.sede || '—'}</td>
                    <td data-label="Docente">{c.docente || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
