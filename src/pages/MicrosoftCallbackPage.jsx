import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { postJson, setStoredToken } from '../lib/api';

/** Debe coincidir con MICROSOFT_REDIRECT_URI del backend (no con window.location si difiere). */
const redirectUriDefault = import.meta.env.VITE_MICROSOFT_REDIRECT_URI ||
  `${window.location.origin}/callback-microsoft`;

export function MicrosoftCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const oauthError = params.get('error');
  const oauthErrorDesc = params.get('error_description');
  const code = params.get('code');

  const exchange = useMutation({
    mutationFn: (authorizationCode) =>
      postJson('/api/auth/microsoft/token', {
        code: authorizationCode,
        redirect_uri: redirectUriDefault,
      }),
    onSuccess: (data) => {
      if (data?.accessToken) {
        setStoredToken(data.accessToken);
        navigate('/', { replace: true });
      }
    },
  });

  useEffect(() => {
    if (oauthError || !code) return;
    const dedupeKey = `ms_oauth_used_${code}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');
    exchange.mutate(code);
  }, [code, oauthError, exchange]);

  const message = oauthError
    ? oauthErrorDesc || oauthError || 'No se pudo iniciar sesión'
    : !code
      ? 'Falta el código en la URL.'
      : exchange.isPending
        ? 'Completando…'
        : exchange.isError
          ? exchange.error?.message || 'Error al validar'
          : exchange.isSuccess
            ? 'Redirigiendo…'
            : '…';

  return (
    <div className="auth-page d-flex align-items-center justify-content-center">
      <div className="auth-card card border-0 bg-white p-4 text-center">
        <div className="spinner-border text-primary mb-3" role="status" aria-hidden="true" />
        <p className="mb-0 text-muted small">{message}</p>
        <button
          type="button"
          className="btn btn-link btn-sm mt-3"
          onClick={() => navigate('/login', { replace: true })}
        >
          Volver al login
        </button>
      </div>
    </div>
  );
}
