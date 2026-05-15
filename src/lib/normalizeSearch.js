import {
  getCursoNombre,
  getDocumento,
  getGrupo,
  getNombreCompleto,
  getParticipante,
  getRutaLabel,
} from './inscritoHelpers.js';
import { formatFechaCorta } from './formatDate.js';

/** Quita tildes y pasa a minúsculas para comparar búsquedas. */
export function normalizeForSearch(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function matchesParticipantName(nombreCompleto, query) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(nombreCompleto).includes(q);
}

/** Texto indexable con la información visible del participante/inscripción. */
export function buildParticipantSearchText(inscrito) {
  const p = getParticipante(inscrito) || {};
  const padre = p?.padreInfo || {};
  const resp = p?.responsableInfo || {};

  const parts = [
    getNombreCompleto(inscrito),
    getDocumento(inscrito),
    getCursoNombre(inscrito),
    getGrupo(inscrito),
    getRutaLabel(inscrito),
    inscrito?.Sede,
    inscrito?.sede,
    inscrito?.Estado,
    inscrito?.estado,
    p?.fechaNacimiento,
    p?.fechaNacimiento ? formatFechaCorta(p.fechaNacimiento) : '',
    padre?.nombreMadre,
    padre?.nombrePadre,
    padre?.emailMadre,
    padre?.emailPadre,
    padre?.celularMadre,
    padre?.celularPadre,
    resp?.Nombre_Completo,
    resp?.nombre_completo,
    resp?.Celular_Responsable,
    resp?.celular_responsable,
    resp?.Correo_Responsable,
    resp?.correo_responsable,
    p?.rutaExtra?.name,
  ];

  return parts.filter(Boolean).join(' ');
}

export function matchesParticipantSearch(inscrito, query) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(buildParticipantSearchText(inscrito)).includes(q);
}
