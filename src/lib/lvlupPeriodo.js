const TZ = 'America/Bogota';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function periodoActualColombia() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    anio: Number(parts.year),
    mes: Number(parts.month),
  };
}

export function etiquetaMes(mes) {
  const n = Number(mes);
  return MESES[n - 1] || `Mes ${n}`;
}

export function etiquetaPeriodo(anio, mes) {
  return `${etiquetaMes(mes)} ${anio}`;
}

export const MESES_OPCIONES = MESES.map((nombre, idx) => ({
  value: idx + 1,
  label: nombre,
}));
