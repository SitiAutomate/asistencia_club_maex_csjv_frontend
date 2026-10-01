import { IconCheck, IconDownload, IconPlus } from './GestionIcons.jsx';

/**
 * Botones flotantes: nuevo / guardar / export.
 * Transparentes en reposo; color al hover.
 */
export function GestionFab({
  onNew,
  onSave,
  onExport,
  canCreate = true,
  canSave = false,
  canExport = false,
  exporting = false,
  saving = false,
  exportDisabled = false,
  saveDisabled = false,
  newTitle = 'Nuevo',
  saveTitle = 'Guardar',
  exportTitle = 'Exportar Excel',
}) {
  if (!canCreate && !canSave && !canExport) return null;

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
      {canSave ? (
        <button
          type="button"
          className="att-gestion-fab__btn att-gestion-fab__btn--save"
          title={saving ? 'Guardando…' : saveTitle}
          aria-label={saveTitle}
          disabled={saving || saveDisabled}
          onClick={onSave}
        >
          <IconCheck size={20} />
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
