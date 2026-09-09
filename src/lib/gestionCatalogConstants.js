/** Tipos de documento canónicos (valores guardados en BD). */

export const TIPOS_DOC_PARTICIPANTE = [
  { value: 'REGISTRO CIVIL', label: 'Registro civil' },
  { value: 'TARJETA DE IDENTIDAD', label: 'Tarjeta de identidad' },
  { value: 'CÉDULA DE CIUDADANIA', label: 'Cédula de ciudadanía' },
  { value: 'TARJETA DE EXTRANJERIA', label: 'Tarjeta de extranjería' },
  { value: 'CÉDULA DE EXTRANJERIA', label: 'Cédula de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export const TIPOS_DOC_RESPONSABLE = [
  { value: 'CÉDULA DE CIUDADANIA', label: 'Cédula de ciudadanía' },
  { value: 'TARJETA DE EXTRANJERIA', label: 'Tarjeta de extranjería' },
  { value: 'CÉDULA DE EXTRANJERIA', label: 'Cédula de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
];

export const TIPOS_PERSONA_RESPONSABLE = [
  { value: 'Persona Natural', label: 'Persona natural' },
  // BD: Tipo_Persona varchar(15) — "Persona Jurídica" no cabe; se guarda truncado como en AppSheet
  { value: 'Persona Jurídic', label: 'Persona jurídica' },
];

export const INTERNO_EXTERNO_OPTS = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Externo', label: 'Externo' },
];

export function buildNombreCompleto(...parts) {
  return parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' ');
}
