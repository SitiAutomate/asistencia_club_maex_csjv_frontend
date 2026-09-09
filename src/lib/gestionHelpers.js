/** Año/mes actuales en America/Bogota (cliente). */
export function anioMesBogotaClient() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const anio = Number(parts.find((p) => p.type === 'year')?.value ?? new Date().getFullYear());
  const mes = parts.find((p) => p.type === 'month')?.value ?? '01';
  return { anio, mes, mesNum: Number(mes) };
}

/** Fecha calendario YYYY-MM-DD en America/Bogota (evita desfase UTC en inputs date). */
export function fechaHoyBogotaClient() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Periodos permitidos para nuevas inscripciones:
 * mes actual y siguiente (en diciembre el siguiente es enero del año siguiente).
 */
export function periodosInscripcionPermitidosClient() {
  const { anio, mesNum } = anioMesBogotaClient();
  const actual = { anio, mes: String(mesNum).padStart(2, '0') };
  let nextAnio = anio;
  let nextMes = mesNum + 1;
  if (nextMes > 12) {
    nextMes = 1;
    nextAnio = anio + 1;
  }
  const siguiente = { anio: nextAnio, mes: String(nextMes).padStart(2, '0') };
  return [actual, siguiente];
}

export function isPeriodoInscripcionPermitidoClient(anio, mes) {
  const a = Number(anio);
  const m = String(mes || '').padStart(2, '0');
  return periodosInscripcionPermitidosClient().some(
    (p) => p.anio === a && p.mes === m,
  );
}
