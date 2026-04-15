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
