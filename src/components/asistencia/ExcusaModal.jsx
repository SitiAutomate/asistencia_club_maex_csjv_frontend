import { useState } from 'react';

export function ExcusaModal({ open, onClose, onConfirm, isPending, participantName }) {
  const [text, setText] = useState('');

  if (!open) return null;

  return (
    <div
      className="att-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="excusa-title"
      onClick={(e) => e.target === e.currentTarget && !isPending && onClose()}
    >
      <div className="att-modal att-modal--excusa" onClick={(e) => e.stopPropagation()}>
        <div className="att-modal__head">
          <h2 id="excusa-title" className="att-modal__title">
            Registrar excusa
          </h2>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="att-modal__body">
          {participantName && (
            <p className="small text-muted mb-2">
              Participante: <strong className="text-body">{participantName}</strong>
            </p>
          )}
          <label htmlFor="excusa-comentario" className="form-label small fw-semibold">
            Comentarios
          </label>
          <textarea
            id="excusa-comentario"
            className="form-control"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe el motivo de la excusa…"
            disabled={isPending}
          />
          <div className="d-flex gap-2 justify-content-end mt-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={isPending}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isPending || !text.trim()}
              onClick={() => onConfirm(text.trim())}
            >
              {isPending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
