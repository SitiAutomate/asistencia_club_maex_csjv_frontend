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
  { key: 'lvlup', path: '/lvlup', label: 'LVL UP', envKey: 'VITE_VIEW_LVLUP' },
];

const LVLUP_ONLY_ROLE = 'MaestroLVLUP';

const ROLE_LABELS = {
  [LVLUP_ONLY_ROLE]: 'Maestro LVL UP',
  Administrador: 'Administrador',
  Desarrollador: 'Desarrollador',
};

export function getRoleLabel(rol) {
  const key = String(rol || '').trim();
  return ROLE_LABELS[key] || key;
}

export function isMaestroLvlupRole(user) {
  return String(user?.rol || '').trim() === LVLUP_ONLY_ROLE;
}

export function getEnabledNavItems() {
  const items = NAV_DEF.filter((item) => isEnabled(import.meta.env[item.envKey]));
  if (items.length === 0) {
    return NAV_DEF.filter((i) => i.key === 'asistencia');
  }
  return items;
}

/** Ítems visibles según rol (además de flags .env). */
export function getNavItemsForUser(user) {
  const rol = String(user?.rol || '').trim();
  const enabled = getEnabledNavItems();

  if (rol === LVLUP_ONLY_ROLE) {
    const lvlup = enabled.filter((item) => item.key === 'lvlup');
    if (lvlup.length) return lvlup;
    return NAV_DEF.filter((item) => item.key === 'lvlup');
  }

  return enabled.filter(
    (item) =>
      item.key !== 'historial' &&
      (item.key !== 'administrador' || rol === 'Administrador'),
  );
}

export function isNavKeyEnabled(key) {
  return getEnabledNavItems().some((i) => i.key === key);
}

export function canUserAccessNavKey(user, key) {
  return getNavItemsForUser(user).some((i) => i.key === key);
}

/** Primera ruta del menú habilitada (fallback /asistencia si ninguna coincide). */
export function getDefaultAppPath() {
  const items = getEnabledNavItems();
  if (items.length > 0) return items[0].path;
  return '/asistencia';
}

export function getDefaultAppPathForUser(user) {
  const items = getNavItemsForUser(user);
  if (items.length > 0) return items[0].path;
  if (isMaestroLvlupRole(user)) return '/lvlup';
  return getDefaultAppPath();
}
