import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthShell } from '../components/AuthShell.jsx';
import { AuthConfirmationLayout } from '../components/AuthConfirmationLayout.jsx';
import { getJson } from '../lib/api.js';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = (params.get('token') || '').trim();

  const { isPending, isError, error, isSuccess } = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => getJson(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
    enabled: token.length > 0,
    retry: false,
  });

  return (
    <AuthShell>
      {!token ? (
        <AuthConfirmationLayout
          tone="error"
          title="Enlace no válido"
          primaryTo="/registro"
          primaryLabel="Ir a registro"
        >
          <p className="mb-0">
            Falta el código de confirmación en el enlace. Abra el enlace completo que recibió por
            correo o solicite un nuevo registro.
          </p>
        </AuthConfirmationLayout>
      ) : isPending ? (
        <AuthConfirmationLayout tone="pending" title="Confirmando su cuenta…" primaryTo={null} primaryLabel={null}>
          <p className="mb-0 text-center">Espere un momento mientras validamos su enlace.</p>
        </AuthConfirmationLayout>
      ) : isError ? (
        <AuthConfirmationLayout
          tone="error"
          title="No pudimos confirmar la cuenta"
          primaryTo="/login"
          primaryLabel="Ir al inicio de sesión"
        >
          <p className="mb-3">{error?.message || 'El enlace expiró o ya fue utilizado.'}</p>
          <p className="mb-0 small">
            Si ya tiene cuenta, intente iniciar sesión. Si necesita ayuda, contacte a{' '}
            <a href="mailto:clubdeportivo@sanjosevegas.edu.co">soporte</a>.
          </p>
        </AuthConfirmationLayout>
      ) : isSuccess ? (
        <AuthConfirmationLayout title="Cuenta confirmada" primaryTo="/login" primaryLabel="Iniciar sesión">
          <p className="mb-0">
            Su correo quedó verificado. Ya puede iniciar sesión como proveedor con su correo electrónico y
            contraseña.
          </p>
        </AuthConfirmationLayout>
      ) : null}
    </AuthShell>
  );
}
