import { Navigate, useOutletContext } from 'react-router-dom';
import {
  getDefaultAppPathForUser,
  getNavItemsForUser,
  isAdminLike,
} from '../lib/navFeatures.js';
import { canGestion, NAV_KEY_GESTION_MODULO, useGestionPermisos } from '../lib/useGestionPermisos.js';

/** Redirige la raíz autenticada a la primera vista habilitada / con permiso */
export function HomeRedirect() {
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);

  if (isAdminLike(user)) {
    if (permisosQuery.isPending) {
      return (
        <div className="att-main d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      );
    }
    const first = getNavItemsForUser(user).find((item) => {
      const modulo = NAV_KEY_GESTION_MODULO[item.key];
      if (!modulo) return true;
      return canGestion(permisosQuery.data, modulo, 'leer');
    });
    if (first) return <Navigate to={first.path} replace />;
  }

  return <Navigate to={getDefaultAppPathForUser(user)} replace />;
}
