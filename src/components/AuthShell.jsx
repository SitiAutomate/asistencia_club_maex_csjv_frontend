export function AuthShell({ children }) {
  return (
    <div className="auth-page d-flex align-items-center">
      <div className="auth-card card border-0 bg-white">
        <div className="card-body p-4 p-sm-5">
          <header className="text-center mb-4">
            <img
              src="/branding/logo-club.png"
              alt="Club Deportivo San José de Las Vegas"
              className="auth-logo d-block mx-auto"
              width={220}
              height={72}
            />
            <h1 className="auth-title mt-3">Asistencia Club Deportivo</h1>
          </header>
          {children}
          <p className="text-center small auth-help mt-4 mb-0">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:clubdeportivo@sanjosevegas.edu.co">Contacta soporte</a>
          </p>
        </div>
      </div>
    </div>
  );
}
