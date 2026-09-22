import { canAccessDocs, getNavItemsForUser, isAdminLike } from './navFeatures.js';
import { canGestion } from './useGestionPermisos.js';

const STORAGE_KEY = 'att-last-route';

/** Rutas de app conocidas (pathname exacto). */
const KNOWN_PATHS = new Set([
  '/asistencia',
  '/historial',
  '/informacion',
  '/rubricas',
  '/reportes',
  '/gestion',
  '/gestion/otros',
  '/gestion/participantes',
  '/gestion/responsables',
  '/gestion/cursos',
  '/gestion/entrenadores',
  '/gestion/campos',
  '/gestion/permisos',
  '/gestion/auditoria',
  '/administrador',
  '/lvlup',
  '/documentacion',
]);

const PATH_GESTION_MODULO = {
  '/gestion': 'inscripciones',
  '/gestion/otros': 'otros',
  '/gestion/participantes': 'participantes',
  '/gestion/responsables': 'responsables',
  '/gestion/cursos': 'cursos',
  '/gestion/entrenadores': 'entrenadores',
  '/gestion/campos': 'tipo_campos',
  '/gestion/permisos': 'permisos',
  '/gestion/auditoria': 'auditoria',
};

const PATH_NAV_KEY = {
  '/asistencia': 'asistencia',
  '/historial': 'historial',
  '/informacion': 'informacion',
  '/rubricas': 'rubricas',
  '/reportes': 'reportes',
  '/gestion': 'gestion',
  '/gestion/otros': 'gestion',
  '/gestion/participantes': 'gestion-participantes',
  '/gestion/responsables': 'gestion-responsables',
  '/gestion/cursos': 'gestion-cursos',
  '/gestion/entrenadores': 'gestion-entrenadores',
  '/gestion/campos': 'gestion',
  '/gestion/permisos': 'gestion',
  '/gestion/auditoria': 'gestion',
  '/administrador': 'administrador',
  '/lvlup': 'lvlup',
};

export function normalizeAppPath(raw) {
  if (!raw) return '';
  try {
    const s = String(raw).trim();
    const path = s.startsWith('http') ? new URL(s).pathname : s.split('?')[0].split('#')[0];
    const cleaned = path.replace(/\/+$/, '') || '/';
    return cleaned === '/' ? '' : cleaned;
  } catch {
    return '';
  }
}

export function saveLastRoute(pathname) {
  const path = normalizeAppPath(pathname);
  if (!path || !KNOWN_PATHS.has(path)) return;
  try {
    localStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* ignore */
  }
}

export function loadLastRoute() {
  try {
    return normalizeAppPath(localStorage.getItem(STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

/**
 * Devuelve la última ruta si el usuario aún puede abrirla; si no, null.
 * @param {{ skipPermisosCheck?: boolean }} [opts] — si true, no exige payload de permisos (aún cargando).
 */
export function resolveLastRouteForUser(user, permisosPayload, opts = {}) {
  const path = loadLastRoute();
  if (!path || !KNOWN_PATHS.has(path)) return null;

  if (path === '/documentacion') {
    return canAccessDocs(user) ? path : null;
  }

  const allowedNav = new Set(getNavItemsForUser(user).map((i) => i.key));
  const navKey = PATH_NAV_KEY[path];

  if (path.startsWith('/gestion')) {
    if (!isAdminLike(user)) return null;
    if (!allowedNav.has('gestion') && !allowedNav.has(navKey)) return null;
    const modulo = PATH_GESTION_MODULO[path];
    if (modulo) {
      if (opts.skipPermisosCheck && !permisosPayload) return path;
      if (!canGestion(permisosPayload, modulo, 'leer')) return null;
    }
    return path;
  }

  if (navKey && !allowedNav.has(navKey)) return null;
  return path;
}
