/** Fecha calendario en America/Bogota (YYYY-MM-DD). */
export function fechaHoyColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export function ymdColombiaDesdeDate(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
}

/** Máximo un envío por día calendario (Colombia). */
export function informeYaEnviadoHoyColombia(evaluacion) {
  if (!evaluacion?.enviado || !evaluacion?.fechaEnvio) return false;
  const hoy = fechaHoyColombia();
  const envio = ymdColombiaDesdeDate(evaluacion.fechaEnvio);
  return Boolean(envio && envio === hoy);
}
