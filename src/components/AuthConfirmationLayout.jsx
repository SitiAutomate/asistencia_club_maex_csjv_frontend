import { Link } from 'react-router-dom';
import { IconArrowRight } from './auth/AuthIcons.jsx';

export function AuthConfirmationLayout({
  tone = 'success',
  title,
  children,
  primaryTo = '/login',
  primaryLabel = 'Ir al inicio de sesión',
}) {
  const iconClass =
    tone === 'error'
      ? 'auth-confirm-icon auth-confirm-icon--error'
      : tone === 'pending'
        ? 'auth-confirm-icon auth-confirm-icon--pending'
        : 'auth-confirm-icon auth-confirm-icon--success';

  return (
    <div className="auth-confirm text-center py-1">
      <div className={iconClass} aria-hidden="true">
        {tone === 'success' && (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {tone === 'error' && (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 9v4M12 17h.01M10.3 3h3.4L21 17.5a1 1 0 01-.9 1.5H3.8a1 1 0 01-.9-1.5L10.3 3z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {tone === 'pending' && (
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Cargando</span>
          </div>
        )}
      </div>
      <h2 className="auth-section-title mb-3 text-center">{title}</h2>
      <div className="auth-muted text-start mx-auto" style={{ maxWidth: '28rem' }}>
        {children}
      </div>
      {primaryTo != null && primaryTo !== '' && primaryLabel ? (
        <Link to={primaryTo} className="btn btn-auth-primary w-100 mt-4">
          {primaryLabel}
          <IconArrowRight />
        </Link>
      ) : null}
    </div>
  );
}
