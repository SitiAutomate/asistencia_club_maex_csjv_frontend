import { Navigate } from 'react-router-dom';
import { getDefaultAppPath } from '../lib/navFeatures.js';

/** Redirige la raíz autenticada a la primera vista habilitada en .env */
export function HomeRedirect() {
  return <Navigate to={getDefaultAppPath()} replace />;
}
