import { Link } from 'react-router-dom';
import { IconArrowRight } from '../components/auth/AuthIcons.jsx';

export function PlaceholderPage({ title, children }) {
  return (
    <div className="auth-page d-flex align-items-center">
      <div className="auth-card card border-0 bg-white">
        <div className="card-body p-4 p-sm-5 text-center">
          <h1 className="auth-section-title">{title}</h1>
          <p className="auth-muted mb-4">{children}</p>
          <Link to="/login" className="btn btn-auth-primary">
            Volver al inicio de sesión
            <IconArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}
