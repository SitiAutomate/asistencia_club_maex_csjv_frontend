import { Navigate } from 'react-router-dom';
import { getDefaultAppPath, isNavKeyEnabled } from '../../lib/navFeatures.js';

export function PlaceholderPanelPage({ title, navKey }) {
  if (!isNavKeyEnabled(navKey)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  return (
    <div className="att-main">
      <h2 className="h5 fw-bold mb-2" style={{ color: 'var(--auth-blue-dark)' }}>
        {title}
      </h2>
      <p className="text-muted small mb-0">Esta sección estará disponible próximamente.</p>
    </div>
  );
}
