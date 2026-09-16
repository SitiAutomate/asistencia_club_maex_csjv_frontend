/**
 * Fechas solo-calendario (YYYY-MM-DD) no deben parsearse con `new Date('YYYY-MM-DD')`:
 * JS las interpreta en UTC y en Colombia (UTC-5) pueden mostrarse con un día menos.
 */
export function parseFechaCalendarioLocal(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const local = new Date(y, mo, d);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatFechaCorta(value, locale = 'es-CO') {
  if (!value) return '—';
  const d = parseFechaCalendarioLocal(value);
  if (!d) return String(value).slice(0, 10);
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Valor para <input type="date">: YYYY-MM-DD o ''.
 * Descarta años absurdos (p. ej. 0003-09-26 por datos legacy corruptos).
 */
export function toDateInput(value, { minYear = 1990, maxYear = 2100 } = {}) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    if (y < minYear || y > maxYear) return '';
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return '';
  const y = Number(m[1]);
  if (y < minYear || y > maxYear) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Fecha + hora (para auditoría / timestamps). */
export function formatFechaHora(value, locale = 'es-CO') {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
