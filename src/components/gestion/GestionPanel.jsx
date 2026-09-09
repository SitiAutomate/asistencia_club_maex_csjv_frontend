import { useEffect, useState } from 'react';
import { SlideDrawer } from './SlideDrawer.jsx';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock.js';
import { getGestionPanelMode } from '../../lib/gestionPanelMode.js';
import { IconLayoutPanel, IconLayoutWindows } from './GestionIcons.jsx';

/**
 * Contenedor unificado: panel lateral (drawer) o modal clásico.
 * La preferencia vive en localStorage (`att-gestion-panel-mode`).
 */
export function GestionPanel({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  footer,
  width = 480,
  size = 'lg',
  children,
  className = '',
}) {
  const [mode, setMode] = useState(getGestionPanelMode);
  const useDrawer = mode === 'drawer';

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => setMode(getGestionPanelMode());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('att-gestion-panel-mode', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('att-gestion-panel-mode', sync);
    };
  }, [open]);

  useBodyScrollLock(open && !useDrawer);

  if (!open) return null;

  if (useDrawer) {
    return (
      <SlideDrawer
        open={open}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        footer={footer}
        width={width}
      >
        {children}
      </SlideDrawer>
    );
  }

  const dialogClass =
    size === 'xl' ? 'modal-dialog modal-xl modal-dialog-scrollable' : 'modal-dialog modal-lg modal-dialog-scrollable';

  return (
    <div
      className={`modal fade show d-block ${className}`.trim()}
      tabIndex={-1}
      role="dialog"
      style={{ background: 'rgba(15,39,71,0.45)' }}
    >
      <div className={dialogClass}>
        <div className="modal-content">
          <div className="modal-header">
            <div className="min-w-0 flex-grow-1">
              {eyebrow ? <div className="att-drawer__eyebrow">{eyebrow}</div> : null}
              <h5 className="modal-title mb-0">{title}</h5>
              {subtitle ? <div className="small text-muted mt-1">{subtitle}</div> : null}
            </div>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Botón para alternar panel lateral ↔ ventana modal. */
export function GestionPanelModeToggle({ className = '' }) {
  const [mode, setMode] = useState(getGestionPanelMode);
  const isDrawer = mode === 'drawer';

  return (
    <button
      type="button"
      className={`att-gestion-chip ${className}`.trim()}
      title={
        isDrawer
          ? 'Cambiar a ventanas (modal)'
          : 'Cambiar a panel lateral derecho'
      }
      onClick={() => {
        const next = isDrawer ? 'modal' : 'drawer';
        try {
          localStorage.setItem('att-gestion-panel-mode', next);
        } catch {
          /* ignore */
        }
        setMode(next);
        window.dispatchEvent(new Event('att-gestion-panel-mode'));
      }}
    >
      <span className="att-gestion-chip__icon" aria-hidden="true">
        {isDrawer ? <IconLayoutWindows /> : <IconLayoutPanel />}
      </span>
      <span className="att-gestion-chip__text">
        <span className="att-gestion-chip__label">{isDrawer ? 'Ventanas' : 'Panel lateral'}</span>
        <span className="att-gestion-chip__hint">{isDrawer ? 'Abrir como modal' : 'Ficha a la derecha'}</span>
      </span>
    </button>
  );
}
