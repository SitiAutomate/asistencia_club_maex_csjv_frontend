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
  { key: 'gestion', path: '/gestion', label: 'Inscripciones', envKey: 'VITE_VIEW_GESTION' },
  { key: 'gestion-participantes', path: '/gestion/participantes', label: 'Participantes', envKey: 'VITE_VIEW_GESTION' },
  { key: 'gestion-responsables', path: '/gestion/responsables', label: 'Responsables', envKey: 'VITE_VIEW_GESTION' },
  { key: 'gestion-cursos', path: '/gestion/cursos', label: 'Cursos', envKey: 'VITE_VIEW_GESTION' },
  { key: 'gestion-entrenadores', path: '/gestion/entrenadores', label: 'Entrenadores', envKey: 'VITE_VIEW_GESTION' },
  { key: 'administrador', path: '/administrador', label: 'Informes', envKey: 'VITE_VIEW_ADMINISTRADOR' },
  { key: 'lvlup', path: '/lvlup', label: 'LVL UP', envKey: 'VITE_VIEW_LVLUP' },
];

const LVLUP_ONLY_ROLE = 'MaestroLVLUP';
const GESTION_KEYS = new Set([
  'gestion',
  'gestion-participantes',
  'gestion-responsables',
  'gestion-cursos',
  'gestion-entrenadores',
]);

const ROLE_LABELS = {
  [LVLUP_ONLY_ROLE]: 'Maestro LVL UP',
  SuperAdministrador: 'Super administrador',
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

/** Administrador operativo + SuperAdministrador (informes, gestión, alcance admin). */
export function isAdminLike(userOrRol) {
  const rol =
    typeof userOrRol === 'string' || userOrRol == null
      ? String(userOrRol || '').trim()
      : String(userOrRol?.rol || '').trim();
  return rol === 'Administrador' || rol === 'SuperAdministrador';
}

export function isSuperAdmin(userOrRol) {
  const rol =
    typeof userOrRol === 'string' || userOrRol == null
      ? String(userOrRol || '').trim()
      : String(userOrRol?.rol || '').trim();
  return rol === 'SuperAdministrador';
}

export function canAccessDocs(userOrRol) {
  const rol =
    typeof userOrRol === 'string' || userOrRol == null
      ? String(userOrRol || '').trim()
      : String(userOrRol?.rol || '').trim();
  return rol === 'Desarrollador' || rol === 'SuperAdministrador';
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

  return enabled.filter((item) => {
    if (item.key === 'historial') return false;
    if (item.key === 'administrador' || GESTION_KEYS.has(item.key)) {
      return isAdminLike(rol);
    }
    return true;
  });
}

export function isNavKeyEnabled(key) {
  if (GESTION_KEYS.has(key) || key === 'gestion') {
    return getEnabledNavItems().some((i) => GESTION_KEYS.has(i.key) || i.key === 'gestion');
  }
  return getEnabledNavItems().some((i) => i.key === key);
}

export function canUserAccessNavKey(user, key) {
  return getNavItemsForUser(user).some((i) => i.key === key || (key === 'gestion' && GESTION_KEYS.has(i.key)));
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
