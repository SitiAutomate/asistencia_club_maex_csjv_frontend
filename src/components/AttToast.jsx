import { useCallback, useState } from 'react';

/**
 * Toast flotante reutilizable (mismo estilo que LVL UP / rúbricas).
 */
export function useAttToast() {
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message: String(message || '') });
    window.setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      type === 'danger' ? 3200 : 2600,
    );
  }, []);

  return { toast, showToast, setToast };
}

export function AttToast({ toast, onClose }) {
  if (!toast?.show) return null;
  return (
    <div
      className={`att-toast att-toast--${toast.type === 'danger' ? 'error' : 'success'}`}
      role="status"
    >
      <div className="att-toast__icon" aria-hidden="true">
        {toast.type === 'danger' ? '!' : '✓'}
      </div>
      <p className="att-toast__text">{toast.message}</p>
      <button
        type="button"
        className="att-toast__close"
        aria-label="Cerrar"
        onClick={() => onClose?.()}
      >
        ×
      </button>
    </div>
  );
}
