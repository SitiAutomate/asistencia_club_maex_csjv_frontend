import { Navigate, useOutletContext } from 'react-router-dom';
import {
  canUserAccessNavKey,
  getDefaultAppPathForUser,
  isAdminLike,
  isNavKeyEnabled,
} from '../../lib/navFeatures.js';
import {
  canGestion,
  firstGestionPath,
  useGestionPermisos,
} from '../../lib/useGestionPermisos.js';

/**
 * Protege rutas /gestion/* por módulo (permiso leer).
 * SuperAdministrador pasa siempre vía API de permisos efectivos.
 */
export function RequireGestionModulo({ modulo, children }) {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);

  if (!isNavKeyEnabled('gestion') || !isAdminLike(user) || !canUserAccessNavKey(user, 'gestion')) {
    return <Navigate to={getDefaultAppPathForUser(user)} replace />;
  }

  if (permisosQuery.isPending) {
    return (
      <div className="att-main d-flex align-items-center justify-content-center py-5">
        <div className="spinner-border text-primary" role="status" aria-label="Cargando permisos" />
      </div>
    );
  }

  if (!canGestion(permisosQuery.data, modulo, 'leer')) {
    const alt = firstGestionPath(permisosQuery.data) || getDefaultAppPathForUser(user);
    return <Navigate to={alt} replace />;
  }

  return children;
}
