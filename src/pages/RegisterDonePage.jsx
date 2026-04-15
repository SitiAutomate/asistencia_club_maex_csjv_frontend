import { useLocation, Navigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { AuthConfirmationLayout } from '../components/AuthConfirmationLayout.jsx';

export function RegisterDonePage() {
  const { state } = useLocation();
  const email = state?.email;
  const nombre = state?.nombre;

  if (!email) {
    return <Navigate to="/registro" replace />;
  }

  return (
    <AuthShell>
      <AuthConfirmationLayout
        title="Revisa tu correo"
        primaryTo="/login"
        primaryLabel="Ir al inicio de sesión"
      >
        <p className="mb-2">
          {nombre ? (
            <>
              <span className="text-body">Hola, </span>
              <strong className="text-body">{nombre}</strong>
              <span className="text-body">.</span>
            </>
          ) : null}{' '}
          Le enviamos un mensaje a <strong className="text-body">{email}</strong> con un enlace para
          confirmar su cuenta de proveedor.
        </p>
        <p className="mb-0">
          Si no ve el correo en unos minutos, revise la carpeta de spam o correo no deseado. El enlace
          caduca si la cuenta ya fue confirmada.
        </p>
      </AuthConfirmationLayout>
    </AuthShell>
  );
}
