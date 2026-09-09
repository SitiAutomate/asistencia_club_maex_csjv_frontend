import { useQuery } from '@tanstack/react-query';
import { getJson } from '../lib/api.js';
import { isAdminLike } from './navFeatures.js';

/**
 * Permisos efectivos de gestión del usuario actual.
 */
export function useGestionPermisos(user) {
  return useQuery({
    queryKey: ['gestion-me-permisos'],
    queryFn: () => getJson('/api/gestion/me/permisos'),
    enabled: isAdminLike(user),
    staleTime: 60_000,
  });
}

/** @param {'leer'|'crear'|'editar'|'eliminar'} accion */
export function canGestion(permisosPayload, modulo, accion = 'leer') {
  if (!permisosPayload?.permisos) return false;
  const p = permisosPayload.permisos[modulo];
  if (!p) return false;
  return Boolean(p[accion]);
}

/** Clave de menú lateral → módulo de permisos */
export const NAV_KEY_GESTION_MODULO = {
  asistencia: 'asistencia',
  informacion: 'informacion',
  rubricas: 'rubricas',
  reportes: 'reportes',
  administrador: 'informes',
  lvlup: 'lvlup',
  gestion: 'inscripciones',
  'gestion-participantes': 'participantes',
  'gestion-responsables': 'responsables',
  'gestion-cursos': 'cursos',
};

const GESTION_PATH_ORDER = [
  ['inscripciones', '/gestion'],
  ['otros', '/gestion/otros'],
  ['participantes', '/gestion/participantes'],
  ['responsables', '/gestion/responsables'],
  ['cursos', '/gestion/cursos'],
  ['tipo_campos', '/gestion/campos'],
  ['permisos', '/gestion/permisos'],
  ['auditoria', '/gestion/auditoria'],
];

/** Primera ruta de gestión con permiso de lectura, o null. */
export function firstGestionPath(permisosPayload) {
  for (const [modulo, path] of GESTION_PATH_ORDER) {
    if (canGestion(permisosPayload, modulo, 'leer')) return path;
  }
  return null;
}

export function hasAnyGestionLeer(permisosPayload) {
  return Boolean(firstGestionPath(permisosPayload));
}
