import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.jsx';
import { MicrosoftCallbackPage } from './pages/MicrosoftCallbackPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { RegisterDonePage } from './pages/RegisterDonePage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { ForgotDonePage } from './pages/ForgotDonePage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { ResetDonePage } from './pages/ResetDonePage.jsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.jsx';
import { RequireAuth } from './components/layout/RequireAuth.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { HomeRedirect } from './pages/HomeRedirect.jsx';
import { AsistenciaPage } from './pages/asistencia/AsistenciaPage.jsx';
import { HistorialPage } from './pages/asistencia/HistorialPage.jsx';
import { InformacionPage } from './pages/asistencia/InformacionPage.jsx';
import { GestionRubricasPage } from './pages/asistencia/GestionRubricasPage.jsx';
import { ReportesPage } from './pages/asistencia/ReportesPage.jsx';
import { AdministradorPage } from './pages/asistencia/AdministradorPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback-microsoft" element={<MicrosoftCallbackPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/registro/listo" element={<RegisterDonePage />} />
        <Route path="/verificar-cuenta" element={<VerifyEmailPage />} />
        <Route path="/recuperar" element={<ForgotPasswordPage />} />
        <Route path="/recuperar/listo" element={<ForgotDonePage />} />
        <Route path="/restablecer" element={<ResetPasswordPage />} />
        <Route path="/restablecer/listo" element={<ResetDonePage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<AppShell />}>
            <Route index element={<HomeRedirect />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="historial" element={<HistorialPage />} />
            <Route path="informacion" element={<InformacionPage />} />
            <Route path="rubricas" element={<GestionRubricasPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="administrador" element={<AdministradorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
