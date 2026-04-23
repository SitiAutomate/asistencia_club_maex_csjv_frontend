import {
  IconCalendarSmall,
  IconCheckSmall,
  IconRouteSmall,
  IconUsersSmall,
  IconXSmall,
} from './AttendanceIcons.jsx';
import {
  getCursoNombre,
  getGrupo,
  getNombreCompleto,
  getRutaLabel,
} from '../../lib/inscritoHelpers.js';

export function ParticipantCard({
  inscrito,
  onOpenDetail,
  onReport,
  onExcusa,
  busy,
  activeEntry,
  estado,
}) {
  const nombre = getNombreCompleto(inscrito);
  const curso = getCursoNombre(inscrito);
  const ruta = getRutaLabel(inscrito);
  const grupo = getGrupo(inscrito);
  const activeReport = activeEntry?.reporte || null;
  const estadoNormalizado = String(estado || '').toUpperCase();
  const canReport = estadoNormalizado === 'CONFIRMADO';

  return (
    <article
      className="att-card"
      onClick={() => onOpenDetail(inscrito)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(inscrito);
        }
      }}
    >
      <div className="att-card__accent" aria-hidden="true" />
      <div className="att-card__body">
        <h3 className="att-card__name">{nombre || 'Sin nombre'}</h3>
        <p className="att-card__curso">{curso || '—'}</p>
        <div className="att-card__meta">
          <div className="att-card__meta-row">
            <span className="text-warning" aria-hidden="true">
              <IconRouteSmall />
            </span>
            <span>{ruta}</span>
          </div>
          <div className="att-card__meta-row">
            <span className="text-primary" aria-hidden="true">
              <IconUsersSmall />
            </span>
            <span>{grupo}</span>
          </div>
          {activeReport === 'Excusa' && activeEntry?.comentarios ? (
            <div className="att-card__comentario" title={activeEntry.comentarios}>
              <strong>Excusa:</strong> {activeEntry.comentarios}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className="att-card__actions"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="group"
        aria-label="Registrar asistencia"
      >
        {canReport ? (
          <>
            <button
              type="button"
              className={`att-act att-act--asistio ${activeReport === 'Asistió' ? 'att-act--active' : ''}`}
              disabled={busy}
              onClick={() => onReport(inscrito, 'Asistió')}
            >
              <IconCheckSmall />
              Asistió
            </button>
            <button
              type="button"
              className={`att-act att-act--falto ${activeReport === 'Faltó' ? 'att-act--active' : ''}`}
              disabled={busy}
              onClick={() => onReport(inscrito, 'Faltó')}
            >
              <IconXSmall />
              Faltó
            </button>
            <button
              type="button"
              className={`att-act att-act--excusa ${activeReport === 'Excusa' ? 'att-act--active' : ''}`}
              disabled={busy}
              onClick={() => onExcusa(inscrito)}
            >
              <IconCalendarSmall />
              Excusa
            </button>
          </>
        ) : (
          <span className="att-status-pill">{estadoNormalizado || 'SIN ESTADO'}</span>
        )}
      </div>
    </article>
  );
}
