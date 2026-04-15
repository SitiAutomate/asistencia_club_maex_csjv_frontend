import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthShell } from '../components/AuthShell.jsx';
import { IconMicrosoft, IconSignIn } from '../components/auth/AuthIcons.jsx';
import { getJson, postJson, setSessionToken, setStoredToken } from '../lib/api';
import { queryClient } from '../lib/queryClient.js';

export function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('entrenador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const loginMutation = useMutation({
    mutationFn: () => postJson('/api/auth/login', { email: email.trim().toLowerCase(), password }),
    onSuccess: (data) => {
      if (data?.accessToken) {
        if (remember) setStoredToken(data.accessToken);
        else setSessionToken(data.accessToken);
        queryClient.invalidateQueries();
        navigate('/', { replace: true });
      }
    },
  });

  const microsoftMutation = useMutation({
    mutationFn: async () => {
      const data = await getJson('/api/auth/microsoft/url');
      return data?.url;
    },
    onSuccess: (url) => {
      if (url) window.location.assign(url);
    },
  });

  const error = loginMutation.error?.message || microsoftMutation.error?.message || null;

  return (
    <AuthShell>
      <ul className="nav auth-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link w-100 ${tab === 'entrenador' ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === 'entrenador'}
            onClick={() => setTab('entrenador')}
          >
            Entrenador
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link w-100 ${tab === 'proveedor' ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === 'proveedor'}
            onClick={() => setTab('proveedor')}
          >
            Proveedor
          </button>
        </li>
      </ul>

      {error && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {error}
        </div>
      )}

      {tab === 'entrenador' && (
        <div>
          <h2 className="auth-section-title mb-1">Iniciar sesión — Entrenador</h2>
          <p className="auth-muted mb-4">Accede con tu cuenta Microsoft.</p>
          <button
            type="button"
            className="btn btn-microsoft w-100"
            disabled={microsoftMutation.isPending}
            onClick={() => microsoftMutation.mutate()}
          >
            <IconMicrosoft />
            {microsoftMutation.isPending ? 'Abriendo…' : 'Continuar con Microsoft'}
          </button>
        </div>
      )}

      {tab === 'proveedor' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate();
          }}
        >
          <h2 className="auth-section-title mb-1">Iniciar sesión — Proveedor</h2>
          <p className="auth-muted mb-3">Ingresa tu correo y contraseña.</p>

          <div className="mb-3">
            <label htmlFor="login-email" className="form-label small fw-semibold mb-1">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className="form-control auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="login-password" className="form-label small fw-semibold mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="form-control auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 small">
            <div className="form-check">
              <input
                id="remember"
                type="checkbox"
                className="form-check-input"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="remember">
                Recordar sesión
              </label>
            </div>
            <Link to="/recuperar" className="text-decoration-none fw-semibold small">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-auth-primary w-100"
            disabled={loginMutation.isPending}
          >
            <IconSignIn />
            {loginMutation.isPending ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="text-center small text-muted mt-3 mb-0">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="fw-semibold text-decoration-none">
              Registrarse
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
