import { Navigate } from 'react-router-dom';

/** Ruta legacy: el historial vive en /asistencia?tab=historial */
export function HistorialPage() {
  return <Navigate to="/asistencia?tab=historial" replace />;
}
