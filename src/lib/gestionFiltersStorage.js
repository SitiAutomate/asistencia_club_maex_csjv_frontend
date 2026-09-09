/** Persistencia ligera de filtros de gestión en sessionStorage. */

export function loadGestionFilters(key, defaults = {}) {
  try {
    const raw = sessionStorage.getItem(key);
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
    sessionStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* ignore quota / private mode */
  }
}
