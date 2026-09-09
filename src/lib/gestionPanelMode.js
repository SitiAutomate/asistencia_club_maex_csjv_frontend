const STORAGE_KEY = 'att-gestion-panel-mode';

/** @returns {'drawer' | 'modal'} */
export function getGestionPanelMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'modal' || v === 'drawer') return v;
  } catch {
    /* ignore */
  }
  return 'drawer';
}

/** @param {'drawer' | 'modal'} mode */
export function setGestionPanelMode(mode) {
  const next = mode === 'modal' ? 'modal' : 'drawer';
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export function toggleGestionPanelMode() {
  return setGestionPanelMode(getGestionPanelMode() === 'drawer' ? 'modal' : 'drawer');
}
