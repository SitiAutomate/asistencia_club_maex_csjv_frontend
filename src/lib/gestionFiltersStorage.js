/** Persistencia de filtros de gestión en localStorage (sobrevive recargas). */

export function loadGestionFilters(key, defaults = {}) {
  try {
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...defaults };
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveGestionFilters(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  } catch {
    try {
      sessionStorage.setItem(key, JSON.stringify(values));
    } catch {
      /* ignore quota / private mode */
    }
  }
}
