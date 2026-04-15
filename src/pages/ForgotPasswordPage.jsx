import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthShell } from '../components/AuthShell.jsx';
import { IconMail } from '../components/auth/AuthIcons.jsx';
import { postJson } from '../lib/api.js';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      postJson('/api/auth/forgot-password', { email: email.trim().toLowerCase() }),
    onSuccess: () => {
      navigate('/recuperar/listo', {
        replace: true,
        state: { email: email.trim().toLowerCase() },
      });
    },
  });

  const error = mutation.error?.message;

  return (
    <AuthShell>
      <h2 className="auth-section-title mb-1">Recuperar contraseña</h2>
      <p className="auth-muted mb-4">
        Le enviaremos instrucciones si el correo está registrado como proveedor.
      </p>

      {error && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="mb-4">
          <label htmlFor="fp-email" className="form-label small fw-semibold mb-1">
            Correo electrónico
          </label>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            className="form-control auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-auth-primary w-100"
          disabled={mutation.isPending}
        >
          <IconMail />
          {mutation.isPending ? 'Enviando…' : 'Enviar enlace'}
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
