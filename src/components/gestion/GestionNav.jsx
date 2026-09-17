import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { canGestion, useGestionPermisos } from '../../lib/useGestionPermisos.js';
import { IconBall } from './GestionIcons.jsx';

const LINKS = [
  { to: '/gestion', label: 'Inscripciones', modulo: 'inscripciones', match: (p) => p === '/gestion' },
  { to: '/gestion/otros', label: 'Otros tipos', modulo: 'otros', match: (p) => p.startsWith('/gestion/otros') },
  {
    to: '/gestion/participantes',
    label: 'Participantes',
    modulo: 'participantes',
    match: (p) => p.startsWith('/gestion/participantes'),
  },
  {
    to: '/gestion/responsables',
    label: 'Responsables',
    modulo: 'responsables',
    match: (p) => p.startsWith('/gestion/responsables'),
  },
  {
    to: '/gestion/cursos',
    label: 'Cursos',
    modulo: 'cursos',
    match: (p) => p.startsWith('/gestion/cursos'),
    icon: IconBall,
  },
  {
    to: '/gestion/entrenadores',
    label: 'Entrenadores',
    modulo: 'entrenadores',
    match: (p) => p.startsWith('/gestion/entrenadores'),
  },
  { to: '/gestion/campos', label: 'Campos', modulo: 'tipo_campos', match: (p) => p.startsWith('/gestion/campos') },
  { to: '/gestion/permisos', label: 'Permisos', modulo: 'permisos', match: (p) => p.startsWith('/gestion/permisos') },
  { to: '/gestion/auditoria', label: 'Auditoría', modulo: 'auditoria', match: (p) => p.startsWith('/gestion/auditoria') },
];

/**
 * Navegación fija de gestión: los links no cambian de tamaño al activarse.
 * Se filtran según permisos efectivos del administrador.
 */
export function GestionNav() {
  const { pathname } = useLocation();
  const { user } = useOutletContext() || {};
  const permisosQuery = useGestionPermisos(user);
  const payload = permisosQuery.data;

  const visible = LINKS.filter((link) => {
    if (!permisosQuery.isSuccess) return false;
    return canGestion(payload, link.modulo, 'leer');
  });

  if (!visible.length) return null;

  return (
    <nav className="att-gestion-nav" aria-label="Gestión">
      <div className="att-gestion-nav__links">
        {visible.map((link) => {
          const active = link.match(pathname);
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`att-gestion-nav__link ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {Icon ? (
                <span className="att-gestion-nav__icon" aria-hidden="true">
                  <Icon size={15} />
                </span>
              ) : null}
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
