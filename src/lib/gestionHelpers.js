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
 * Periodos permitidos para nuevas inscripciones / retiros:
 * mes actual y los dos siguientes (en diciembre: ene y feb del año siguiente).
 */
export function periodosInscripcionPermitidosClient() {
  const { anio, mesNum } = anioMesBogotaClient();
  const out = [];
  let a = anio;
  let m = mesNum;
  for (let i = 0; i < 3; i += 1) {
    out.push({ anio: a, mes: String(m).padStart(2, '0') });
    m += 1;
    if (m > 12) {
      m = 1;
      a += 1;
    }
  }
  return out;
}

export function isPeriodoInscripcionPermitidoClient(anio, mes) {
  const a = Number(anio);
  const m = String(mes || '').padStart(2, '0');
  return periodosInscripcionPermitidosClient().some(
    (p) => p.anio === a && p.mes === m,
  );
}
