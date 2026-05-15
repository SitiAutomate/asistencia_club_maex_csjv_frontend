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
