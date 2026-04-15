/**
 * Vistas del panel. En .env usar VITE_VIEW_<CLAVE>=true|false
 * Solo las marcadas true aparecen en el menú y rutas.
 */
const isEnabled = (value) => {
  const v = String(value ?? '').toLowerCase().trim();
  return v === 'true' || v === '1';
};

export const NAV_DEF = [
  { key: 'asistencia', path: '/asistencia', label: 'Asistencia', envKey: 'VITE_VIEW_ASISTENCIA' },
  { key: 'historial', path: '/historial', label: 'Historial', envKey: 'VITE_VIEW_HISTORIAL' },
  { key: 'informacion', path: '/informacion', label: 'Información', envKey: 'VITE_VIEW_INFORMACION' },
  { key: 'rubricas', path: '/rubricas', label: 'Gestión de rúbricas', envKey: 'VITE_VIEW_RUBRICAS' },
  { key: 'reportes', path: '/reportes', label: 'Reportes', envKey: 'VITE_VIEW_REPORTES' },
  { key: 'administrador', path: '/administrador', label: 'Administrador', envKey: 'VITE_VIEW_ADMINISTRADOR' },
];

export function getEnabledNavItems() {
  const items = NAV_DEF.filter((item) => isEnabled(import.meta.env[item.envKey]));
  if (items.length === 0) {
    return NAV_DEF.filter((i) => i.key === 'asistencia');
  }
  return items;
}

export function isNavKeyEnabled(key) {
  return getEnabledNavItems().some((i) => i.key === key);
}

/** Primera ruta del menú habilitada (fallback /asistencia si ninguna coincide). */
export function getDefaultAppPath() {
  const items = getEnabledNavItems();
  if (items.length > 0) return items[0].path;
  return '/asistencia';
}
