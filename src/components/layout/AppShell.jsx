import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJson, setStoredToken } from '../../lib/api.js';
import { queryClient } from '../../lib/queryClient.js';
import { getNavItemsForUser, getRoleLabel } from '../../lib/navFeatures.js';
import { IconClose, IconMenu } from '../asistencia/AttendanceIcons.jsx';
import '../../styles/asistencia/index.css';

const LOGO_VERSION = String(import.meta.env.VITE_BRANDING_VERSION || '1').trim();
const LOGO_SRC = `/branding/logo-club.png?v=${encodeURIComponent(LOGO_VERSION)}`;

const ROUTE_TITLES = {
  '/asistencia': 'Asistencia',
  '/historial': 'Historial',
  '/informacion': 'Información',
  '/rubricas': 'Gestión de rúbricas',
  '/reportes': 'Reportes',
  '/administrador': 'Administrador',
  '/lvlup': 'LVL UP',
  '/documentacion': 'Documentación',
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const title = ROUTE_TITLES[location.pathname] || 'Panel';

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => getJson('/api/auth/me'),
    staleTime: 60_000,
  });

  const user = meQuery.data?.user;
  const canSeeDocs =
    String(user?.rol || '').trim() === 'Desarrollador' ||
    String(user?.rol || '').trim() === 'Administrador';

  const navItems = getNavItemsForUser(user);

  const displayName = String(user?.nombre || '').trim();
  const email = String(user?.email || '').trim();
  const showEmail = email && email.toLowerCase() !== displayName.toLowerCase();

  if (meQuery.isPending) {
    return (
      <div className="att-layout d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <div className="container py-5 text-center">
        <p className="text-danger">No se pudo cargar tu perfil.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
          Volver al login
        </button>
      </div>
    );
  }

  const logout = () => {
    setStoredToken(null);
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const initial = String(user?.nombre || user?.email || '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="att-layout">
      <div
        className={`att-sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`att-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Menú principal">
        <div className="att-sidebar__profile">
          <button
            type="button"
            className="att-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <IconClose />
          </button>
          <div className="att-sidebar__avatar">{initial}</div>
          <div className="att-sidebar__profile-text">
            <div className="att-sidebar__name" title={displayName || email || 'Usuario'}>
              {displayName || email || 'Usuario'}
            </div>
            {showEmail ? (
              <div className="att-sidebar__email" title={email}>
                {email}
              </div>
            ) : null}
            {user?.rol ? (
              <div className="att-sidebar__role">{getRoleLabel(user.rol)}</div>
            ) : null}
          </div>
        </div>
        <nav className="att-sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `att-sidebar__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {canSeeDocs ? (
          <div className="px-3 pb-2">
            <NavLink
              to="/documentacion"
              className={({ isActive }) =>
                `att-sidebar__link d-block ${isActive ? 'is-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              Documentación
            </NavLink>
          </div>
        ) : null}
        <div className="att-sidebar__footer">
          <button type="button" className="att-sidebar__link text-danger" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-grow-1 d-flex flex-column min-w-0">
        <header className="att-header">
          <button
            type="button"
            className="att-header__menu"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            <IconMenu />
          </button>
          <div className="att-header__logos">
            <img
              src={LOGO_SRC}
              alt=""
              height={32}
              onError={(e) => {
                if (e.target.dataset.fallbackApplied === '1') {
                  e.target.style.display = 'none';
                  return;
                }
                e.target.dataset.fallbackApplied = '1';
                e.target.src = '/favicon.svg';
              }}
            />
          </div>
          <h1 className="att-header__title">{title}</h1>
          <div className="att-header__controls" />
        </header>

        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
