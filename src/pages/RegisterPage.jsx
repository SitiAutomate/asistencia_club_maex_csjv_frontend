import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthShell } from '../components/AuthShell.jsx';
import { IconUserPlus } from '../components/auth/AuthIcons.jsx';
import { postJson } from '../lib/api.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [usuarioid, setUsuarioid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  const registerMutation = useMutation({
    mutationFn: () =>
      postJson('/api/auth/register', {
        nombre: nombre.trim(),
        usuarioid: usuarioid.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    onSuccess: () => {
      navigate('/registro/listo', {
        replace: true,
        state: {
          email: email.trim().toLowerCase(),
          nombre: nombre.trim(),
        },
      });
    },
  });

  const clientError =
    password.length > 0 &&
    password2.length > 0 &&
    password !== password2 &&
    'Las contraseñas no coinciden';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== password2) return;
    if (password.length < 8) return;
    registerMutation.mutate();
  };

  const apiError = registerMutation.error?.message;

  return (
    <AuthShell>
      <h2 className="auth-section-title mb-1">Registro — Proveedor</h2>
      <p className="auth-muted mb-4">Completa los datos para crear tu cuenta.</p>

      {clientError && (
        <div className="alert alert-warning py-2 small mb-3" role="alert">
          {clientError}
        </div>
      )}
      {apiError && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="auth-form-grid mb-1">
          <div className="mb-3">
            <label htmlFor="reg-nombre" className="form-label small fw-semibold mb-1">
              Nombre completo
            </label>
            <input
              id="reg-nombre"
              type="text"
              autoComplete="name"
              className="form-control auth-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="reg-doc" className="form-label small fw-semibold mb-1">
              Documento
            </label>
            <input
              id="reg-doc"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="form-control auth-input"
              value={usuarioid}
              onChange={(e) => setUsuarioid(e.target.value)}
              required
            />
          </div>
          <div className="mb-3 auth-span-2">
            <label htmlFor="reg-email" className="form-label small fw-semibold mb-1">
              Correo electrónico
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className="form-control auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="reg-pass" className="form-label small fw-semibold mb-1">
              Contraseña
            </label>
            <input
              id="reg-pass"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="form-control auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="form-text small">Mínimo 8 caracteres.</div>
          </div>
          <div className="mb-3">
            <label htmlFor="reg-pass2" className="form-label small fw-semibold mb-1">
              Confirmar contraseña
            </label>
            <input
              id="reg-pass2"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="form-control auth-input"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-auth-primary w-100"
          disabled={registerMutation.isPending}
        >
          <IconUserPlus />
          {registerMutation.isPending ? 'Enviando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center small text-muted mt-3 mb-0">
        <Link to="/login" className="fw-semibold text-decoration-none">
          Volver al inicio de sesión
        </Link>
      </p>
    </AuthShell>
  );
}
