import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock.js';

/**
 * Panel lateral deslizante (derecha → izquierda), alto completo.
 * Se desmonta al cerrar.
 */
export function SlideDrawer({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  onEdit,
  footer,
  children,
  width = 420,
}) {
  const [entered, setEntered] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`att-drawer-root ${entered ? 'is-entered' : ''}`}>
      <button type="button" className="att-drawer-scrim" aria-label="Cerrar panel" onClick={onClose} />
      <aside
        className="att-drawer"
        style={{ width: `min(${width}px, 100vw)` }}
        role="dialog"
        aria-modal="true"
      >
        <div className="att-drawer__head">
          <div className="min-w-0 flex-grow-1">
            {eyebrow ? <div className="att-drawer__eyebrow">{eyebrow}</div> : null}
            <h3 className="att-drawer__title">{title || 'Detalle'}</h3>
            {subtitle ? <div className="att-drawer__sub">{subtitle}</div> : null}
          </div>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
        </div>
        <div className="att-drawer__body">{children}</div>
        {footer != null ? (
          <div className="att-drawer__foot">{footer}</div>
        ) : onEdit ? (
          <div className="att-drawer__foot">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
              Editar
            </button>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

export function DrawerSection({ title, children }) {
  return (
    <section className="att-drawer-section">
      <h6 className="att-drawer-section__title">{title}</h6>
      {children}
    </section>
  );
}

export function DrawerField({ label, children }) {
  return (
    <div className="att-drawer-field">
      <span className="att-drawer-field__label">{label}</span>
      <div className="att-drawer-field__value">{children ?? '—'}</div>
    </div>
  );
}
