import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthShell } from '../components/AuthShell.jsx';
import { IconLockSaved } from '../components/auth/AuthIcons.jsx';
import { postJson } from '../lib/api.js';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramToken = params.get('token') || '';
  const [token, setToken] = useState(paramToken);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const fromEmail = paramToken.trim().length > 0;

  useEffect(() => {
    setToken(paramToken);
  }, [paramToken]);

  const mutation = useMutation({
    mutationFn: () =>
      postJson('/api/auth/reset-password', {
        token: token.trim(),
        password,
      }),
    onSuccess: () => {
      navigate('/restablecer/listo', { replace: true });
    },
  });

  const mismatch =
    password.length > 0 && password2.length > 0 && password !== password2
      ? 'Las contraseñas no coinciden'
      : null;

  const error = mutation.error?.message;
  const canSubmit = token.trim().length > 0 && password.length >= 8 && password === password2;

  return (
    <AuthShell>
      <h2 className="auth-section-title mb-1">Nueva contraseña</h2>
      <p className="auth-muted mb-4">
        {fromEmail
          ? 'Elija una contraseña nueva para su cuenta de proveedor.'
          : 'Ingrese el código que recibió por correo y su nueva contraseña.'}
      </p>

      {mismatch && (
        <div className="alert alert-warning py-2 small mb-3" role="alert">
          {mismatch}
        </div>
      )}
      {error && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          mutation.mutate();
        }}
      >
        {!fromEmail && (
          <div className="mb-3">
            <label htmlFor="rs-token" className="form-label small fw-semibold mb-1">
              Código del correo
            </label>
            <input
              id="rs-token"
              type="text"
              className="form-control auth-input font-monospace small"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="rs-pass" className="form-label small fw-semibold mb-1">
            Nueva contraseña
          </label>
          <input
            id="rs-pass"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="form-control auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="rs-pass2" className="form-label small fw-semibold mb-1">
            Confirmar contraseña
          </label>
          <input
            id="rs-pass2"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="form-control auth-input"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-auth-primary w-100"
          disabled={mutation.isPending || !canSubmit}
        >
          <IconLockSaved />
          {mutation.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>

      <p className="text-center small text-muted mt-3 mb-0">
        <Link to="/login" className="fw-semibold text-decoration-none">
          Ir al inicio de sesión
        </Link>
      </p>
    </AuthShell>
  );
}
