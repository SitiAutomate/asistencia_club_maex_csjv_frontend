/** Anchos de columna de tablas de gestión (persistidos en localStorage). */

const STORAGE_KEY = 'gestion-table-col-widths';

export const DEFAULT_INSCRIPCIONES_COL_WIDTHS = {
  fecha: 86,
  participante: 150,
  curso: 130,
  estado: 92,
  mes: 70,
  anio: 52,
  sede: 78,
  transporte: 70,
  observaciones: 130,
};

export function loadColWidths(defaults = DEFAULT_INSCRIPCIONES_COL_WIDTHS) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...defaults };
    const next = { ...defaults };
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 48 && n <= 640) next[k] = Math.round(n);
    }
    return next;
  } catch {
    return { ...defaults };
  }
}

export function saveColWidths(widths) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    /* ignore */
  }
}

/**
 * Inicia un arrastre para redimensionar una columna.
 * @returns {{ cleanup: () => void }}
 */
export function startColumnResize({ key, startX, startWidth, min = 52, max = 520, onChange, onEnd }) {
  const onMove = (ev) => {
    const clientX = ev.touches?.[0]?.clientX ?? ev.clientX;
    if (!Number.isFinite(clientX)) return;
    const next = Math.max(min, Math.min(max, Math.round(startWidth + (clientX - startX))));
    onChange?.(key, next);
  };
  const onUp = () => {
    cleanup();
    onEnd?.();
  };
  const cleanup = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    document.body.classList.remove('att-col-resizing');
  };
  document.body.classList.add('att-col-resizing');
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onUp);
  return { cleanup };
}
