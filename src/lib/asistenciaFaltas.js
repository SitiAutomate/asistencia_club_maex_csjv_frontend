import { normalizeForSearch } from './normalizeSearch.js';

export function isReporteFalta(reporte) {
  return normalizeForSearch(String(reporte || '')) === normalizeForSearch('Faltó');
}

export function participanteAsistenciaKey(idcurso, documento) {
  return `${String(idcurso || '').trim()}-${String(documento || '').trim()}`;
}

export function getMesActualRange(referenceDate = new Date()) {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const d = String(referenceDate.getDate()).padStart(2, '0');
  return {
    inicio: `${y}-${m}-01`,
    fin: `${y}-${m}-${d}`,
  };
}

export function buildFaltasMesMap(asistenciaRows) {
  const map = {};
  for (const item of asistenciaRows || []) {
    if (!isReporteFalta(item.reporte)) continue;
    const k = participanteAsistenciaKey(item.idcurso, item.documento);
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}
