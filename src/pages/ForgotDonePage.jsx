import { useLocation, Navigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { AuthConfirmationLayout } from '../components/AuthConfirmationLayout.jsx';

export function ForgotDonePage() {
  const { state } = useLocation();
  const email = state?.email;

  if (!email) {
    return <Navigate to="/recuperar" replace />;
  }

  return (
    <AuthShell>
      <AuthConfirmationLayout
        title="Si el correo está registrado, le escribimos"
        primaryTo="/login"
        primaryLabel="Volver al inicio de sesión"
      >
        <p className="mb-2">
          Si existe una cuenta de proveedor asociada a{' '}
          <strong className="text-body">{email}</strong>, recibirá en breve un correo del Club
          Deportivo San José de Las Vegas con un enlace seguro para restablecer su contraseña.
        </p>
        <p className="mb-0">
          Por seguridad, el mismo mensaje se muestra aunque el correo no esté en el sistema. Revise
          también la carpeta de spam.
        </p>
      </AuthConfirmationLayout>
    </AuthShell>
  );
}
