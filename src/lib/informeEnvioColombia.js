export function anioMesBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return {
    anio: Number(parts.find((p) => p.type === 'year')?.value ?? new Date().getFullYear()),
    mes: Number(parts.find((p) => p.type === 'month')?.value ?? 1),
  };
}

export function periodoInformesActual() {
  const { mes } = anioMesBogota();
  return mes <= 7 ? 'ene_jul' : 'ago_dic';
}

/** Fecha calendario en America/Bogota (YYYY-MM-DD). */
export function fechaHoyColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

const TZ = 'America/Bogota';

export function ymdColombiaDesdeDate(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  const datePart = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (datePart) return datePart[1];
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

export function anioColombiaDesdeValor(value) {
  const ymd = ymdColombiaDesdeDate(value);
  return ymd ? Number(ymd.slice(0, 4)) : null;
}

/** Formatea fechas en calendario Colombia; evita desfase UTC en valores DATE de MySQL. */
export function fmtFechaColombia(value, { conHora = false } = {}) {
  if (!value) return '—';
  const raw = String(value).trim();
  const sqlLocal = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (sqlLocal && !raw.includes('T') && !raw.endsWith('Z')) {
    const [, y, mo, d, h, mi] = sqlLocal;
    const local = new Date(Number(y), Number(mo) - 1, Number(d), Number(h || 0), Number(mi || 0));
    if (conHora && h != null) {
      return local.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return local.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 16);
  if (conHora) {
    return parsed.toLocaleString('es-CO', {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return parsed.toLocaleDateString('es-CO', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Máximo un envío por día calendario (Colombia). */
export function informeYaEnviadoHoyColombia(evaluacion) {
  if (!evaluacion?.enviado || !evaluacion?.fechaEnvio) return false;
  const hoy = fechaHoyColombia();
  const envio = ymdColombiaDesdeDate(evaluacion.fechaEnvio);
  return Boolean(envio && envio === hoy);
}
