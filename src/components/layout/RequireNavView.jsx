import { Navigate, useOutletContext } from 'react-router-dom';
import {
  canUserAccessNavKey,
  getDefaultAppPathForUser,
  isAdminLike,
  isMaestroLvlupRole,
  isNavKeyEnabled,
} from '../../lib/navFeatures.js';
import { canGestion, NAV_KEY_GESTION_MODULO, useGestionPermisos } from '../../lib/useGestionPermisos.js';

export function RequireNavView({ navKey, children }) {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const modulo = NAV_KEY_GESTION_MODULO[navKey];

  if (navKey === 'lvlup' && isMaestroLvlupRole(user)) {
    return children;
  }

  if (!isNavKeyEnabled(navKey)) {
    return <Navigate to={getDefaultAppPathForUser(user)} replace />;
  }

  if (!canUserAccessNavKey(user, navKey)) {
    return <Navigate to={getDefaultAppPathForUser(user)} replace />;
  }

  if (isAdminLike(user) && modulo) {
    if (permisosQuery.isPending) {
      return (
        <div className="att-main d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" aria-label="Cargando permisos" />
        </div>
      );
    }
    if (!canGestion(permisosQuery.data, modulo, 'leer')) {
      return <Navigate to={getDefaultAppPathForUser(user)} replace />;
    }
  }

  return children;
}
