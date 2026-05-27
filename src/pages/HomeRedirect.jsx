import { Navigate, useOutletContext } from 'react-router-dom';
import { getDefaultAppPath, isNavKeyEnabled } from '../lib/navFeatures.js';

/** Redirige la raíz autenticada a la primera vista habilitada en .env */
export function HomeRedirect() {
  const { user } = useOutletContext() || {};
  const isAdmin = String(user?.rol || '').trim() === 'Administrador';
  if (isAdmin && isNavKeyEnabled('administrador')) {
    return <Navigate to="/administrador" replace />;
  }
  return <Navigate to={getDefaultAppPath()} replace />;
}
