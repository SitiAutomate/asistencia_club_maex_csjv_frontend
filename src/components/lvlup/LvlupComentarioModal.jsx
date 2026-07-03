import { useEffect, useState } from 'react';

export function LvlupComentarioModal({ open, onClose, onConfirm, participantName, initialText = '' }) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (open) setText(initialText || '');
  }, [open, initialText]);

  if (!open) return null;

  return (
    <div
      className="att-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lvlup-comentario-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="att-modal att-modal--excusa" onClick={(e) => e.stopPropagation()}>
        <div className="att-modal__head d-flex align-items-center justify-content-between gap-2">
          <h2 id="lvlup-comentario-title" className="att-modal__title">
            Comentario del alumno
          </h2>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="att-modal__body">
          {participantName ? (
            <p className="small text-muted mb-2">
              Alumno: <strong className="text-body">{participantName}</strong>
            </p>
          ) : null}
          <label htmlFor="lvlup-comentario-text" className="form-label small fw-semibold">
            Comentarios
          </label>
          <textarea
            id="lvlup-comentario-text"
            className="form-control"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Observaciones de la sesión, avances, pendientes…"
          />
          <div className="d-flex gap-2 justify-content-end mt-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onConfirm(text.trim())}
            >
              Guardar comentario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
