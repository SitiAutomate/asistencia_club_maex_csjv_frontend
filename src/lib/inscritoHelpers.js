export function getParticipante(inscrito) {
  return inscrito?.participante || null;
}

export function getCursoNombre(inscrito) {
  return inscrito?.curso?.Nombre_del_curso || inscrito?.curso?.nombre_del_curso || '';
}

export function getIdCurso(inscrito) {
  return String(inscrito?.IDCurso ?? inscrito?.idCurso ?? inscrito?.curso?.ID_Curso ?? '').trim();
}

export function getDocumento(inscrito) {
  const p = getParticipante(inscrito);
  return String(p?.idParticipante ?? p?.idparticipante ?? '').trim();
}

export function getNombreCompleto(inscrito) {
  const p = getParticipante(inscrito);
  return String(p?.nombreCompleto ?? p?.nombrecompleto ?? '').trim();
}

export function getGrupo(inscrito) {
  const p = getParticipante(inscrito);
  return String(p?.grupo ?? '').trim() || '—';
}

export function getRutaLabel(inscrito) {
  const p = getParticipante(inscrito);
  const name = p?.rutaExtra?.name;
  if (name) return String(name);
  return 'Sin ruta asignada';
}

export function buildAsistenciaBody(inscrito, responsableEmail, reporte, comentarios = '') {
  const participante = getParticipante(inscrito);
  const tieneRutaExtra = Boolean(participante?.rutaExtra?.name);
  return {
    documento: getDocumento(inscrito),
    nombre: getNombreCompleto(inscrito),
    idcurso: getIdCurso(inscrito),
    curso: getCursoNombre(inscrito),
    responsable: responsableEmail,
    reporte,
    comentarios: comentarios || '',
    ruta: getRutaLabel(inscrito) === 'Sin ruta asignada' ? '' : getRutaLabel(inscrito),
    sede: String(inscrito?.Sede || inscrito?.sede || '').trim(),
    tieneRutaExtra,
  };
}
