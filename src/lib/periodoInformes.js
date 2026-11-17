import { useQuery } from '@tanstack/react-query';
import { getJson } from './api.js';

export function usePeriodoInformesConfig(enabled = true) {
  return useQuery({
    queryKey: ['periodo-informes-config'],
    queryFn: () => getJson('/api/inscritos/periodo-config'),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function periodoEtiqueta(config, periodoId) {
  const item = config?.periodos?.find((p) => p.id === periodoId);
  if (item?.etiqueta) return item.etiqueta;
  return periodoId === 'ago_dic' ? 'Octubre - Noviembre' : 'Mayo - Junio';
}

/**
 * Etiqueta del periodo en admin: rango de informes (may–jun / oct–nov).
 * Los inscritos siguen contándose solo en el mes final.
 */
export function periodoEtiquetaMesCorte(config, periodoId) {
  const item = config?.periodos?.find((p) => p.id === periodoId);
  if (item?.etiqueta) return item.etiqueta;
  if (item?.etiquetaMesCorte && item?.mesInicio === item?.mesFin) return item.etiquetaMesCorte;
  return periodoId === 'ago_dic' ? 'Octubre - Noviembre' : 'Mayo - Junio';
}

export function periodoActualDesdeConfig(config) {
  return config?.periodoActual === 'ago_dic' ? 'ago_dic' : 'ene_jul';
}
