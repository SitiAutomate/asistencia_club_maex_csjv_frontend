import { IconDownload, IconPlus } from './GestionIcons.jsx';

/**
 * Botones flotantes: nuevo (+ export opcional).
 * Transparentes en reposo; color al hover.
 */
export function GestionFab({
  onNew,
  onExport,
  canCreate = true,
  canExport = false,
  exporting = false,
  exportDisabled = false,
  newTitle = 'Nuevo',
  exportTitle = 'Exportar Excel',
}) {
  if (!canCreate && !canExport) return null;

  return (
    <div className="att-gestion-fab" role="group" aria-label="Acciones rápidas">
      {canExport ? (
        <button
          type="button"
          className="att-gestion-fab__btn att-gestion-fab__btn--export"
          title={exporting ? 'Exportando…' : exportTitle}
          aria-label={exportTitle}
          disabled={exporting || exportDisabled}
          onClick={onExport}
        >
          <IconDownload />
        </button>
      ) : null}
      {canCreate ? (
        <button
          type="button"
          className="att-gestion-fab__btn att-gestion-fab__btn--new"
          title={newTitle}
          aria-label={newTitle}
          onClick={onNew}
        >
          <IconPlus size={20} />
        </button>
      ) : null}
    </div>
  );
}
