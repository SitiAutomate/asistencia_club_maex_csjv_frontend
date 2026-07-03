import { Navigate, useOutletContext } from 'react-router-dom';
import {
  canUserAccessNavKey,
  getDefaultAppPathForUser,
  isMaestroLvlupRole,
  isNavKeyEnabled,
} from '../../lib/navFeatures.js';

export function RequireNavView({ navKey, children }) {
  const { user } = useOutletContext() || {};

  if (navKey === 'lvlup' && isMaestroLvlupRole(user)) {
    return children;
  }

  if (!isNavKeyEnabled(navKey)) {
    return <Navigate to={getDefaultAppPathForUser(user)} replace />;
  }

  if (!canUserAccessNavKey(user, navKey)) {
    return <Navigate to={getDefaultAppPathForUser(user)} replace />;
  }

  return children;
}
