import { AuthShell } from '../components/AuthShell.jsx';
import { AuthConfirmationLayout } from '../components/AuthConfirmationLayout.jsx';

export function ResetDonePage() {
  return (
    <AuthShell>
      <AuthConfirmationLayout
        title="Contraseña actualizada"
        primaryTo="/login"
        primaryLabel="Iniciar sesión"
      >
        <p className="mb-0">
          Su nueva contraseña ya está activa. Puede iniciar sesión en el portal de proveedores con su
          correo y la clave que acaba de definir.
        </p>
      </AuthConfirmationLayout>
    </AuthShell>
  );
}
