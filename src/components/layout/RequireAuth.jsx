import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  clearSessionEndedReason,
  getSessionEndedReason,
  getStoredToken,
  getStoredTokenExpirationMs,
} from '../../lib/api.js';

function SessionEndedModal({ open, onLogin }) {
  if (!open) return null;
  return (
    <div className="att-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-ended-title">
      <div className="att-modal att-modal--excusa">
        <div className="att-modal__head">
          <h3 className="att-modal__title" id="session-ended-title">Sesión finalizada</h3>
        </div>
        <div className="att-modal__body d-grid gap-3">
          <p className="mb-0 small text-muted">
            Tu sesión expiró por seguridad. Inicia sesión nuevamente para continuar.
          </p>
          <div className="d-flex justify-content-end">
            <button type="button" className="btn btn-primary btn-sm" onClick={onLogin}>
              Ir al login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => getStoredToken());
  const [showSessionEnded, setShowSessionEnded] = useState(false);

  useEffect(() => {
    let timeoutId = null;

    const refreshTokenState = () => {
      const nextToken = getStoredToken();
      setToken(nextToken);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!nextToken) return;
      const expMs = getStoredTokenExpirationMs();
      if (!expMs) return;

      const remainingMs = Math.max(0, expMs - Date.now());
      timeoutId = window.setTimeout(() => {
        setToken(getStoredToken());
      }, remainingMs + 25);
    };

    const onVisibilityOrFocus = () => {
      refreshTokenState();
    };

    const onStorage = (event) => {
      if (event.key === 'accessToken' || event.key === null) {
        refreshTokenState();
      }
    };

    refreshTokenState();
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    window.addEventListener('storage', onStorage);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (token) return;
    const reason = getSessionEndedReason();
    if (reason === 'expired' || reason === 'unauthorized') {
      setShowSessionEnded(true);
      return;
    }
    navigate('/login', { replace: true });
  }, [token, navigate]);

  if (!token) {
    return (
      <SessionEndedModal
        open={showSessionEnded}
        onLogin={() => {
          clearSessionEndedReason();
          setShowSessionEnded(false);
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  return (
    <>
      <SessionEndedModal
        open={showSessionEnded}
        onLogin={() => {
          clearSessionEndedReason();
          setShowSessionEnded(false);
          navigate('/login', { replace: true });
        }}
      />
      <Outlet />
    </>
  );
}
