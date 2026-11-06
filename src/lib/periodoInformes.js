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

/** Etiqueta del mes final (junio / noviembre) para el dashboard admin. */
export function periodoEtiquetaMesCorte(config, periodoId) {
  const item = config?.periodos?.find((p) => p.id === periodoId);
  if (item?.etiquetaMesCorte) return item.etiquetaMesCorte;
  if (item?.mesFin) {
    const nombres = [
      '',
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
    return nombres[Number(item.mesFin)] || periodoEtiqueta(config, periodoId);
  }
  return periodoId === 'ago_dic' ? 'Noviembre' : 'Junio';
}

export function periodoActualDesdeConfig(config) {
  return config?.periodoActual === 'ago_dic' ? 'ago_dic' : 'ene_jul';
}
