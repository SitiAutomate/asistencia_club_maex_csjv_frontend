export function formatCurrencyCop(value) {
  if (value == null || value === '') return '—';
  const digits = String(value).replace(/[^0-9.-]/g, '');
  const n = Number(digits);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function humanizeLabel(key) {
  const map = {
    documento: 'Documento',
    nombreCompleto: 'Nombre completo',
    primerNombre: 'Primer nombre',
    segundoNombre: 'Segundo nombre',
    primerApellido: 'Primer apellido',
    segundoApellido: 'Segundo apellido',
    tipoDocumento: 'Tipo de documento',
    fechaNacimiento: 'Fecha de nacimiento',
    grupo: 'Grupo',
    idResponsable: 'Documento responsable',
    internoExterno: 'Interno / externo',
    nombrePadre: 'Nombre del padre',
    celularPadre: 'Celular del padre',
    emailPadre: 'Email del padre',
    nombreMadre: 'Nombre de la madre',
    celularMadre: 'Celular de la madre',
    emailMadre: 'Email de la madre',
    nombreResponsable: 'Nombre del responsable',
    celularResponsable: 'Celular del responsable',
    correoResponsable: 'Correo del responsable',
    nombres: 'Nombres',
    apellidos: 'Apellidos',
    celular: 'Celular',
    correo: 'Correo',
    ciudad: 'Ciudad',
    direccion: 'Dirección',
    tipoIdentificacion: 'Tipo de identificación',
    tipoPersona: 'Tipo de persona',
  };
  if (map[key]) return map[key];
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export const MESES_LABEL = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};
