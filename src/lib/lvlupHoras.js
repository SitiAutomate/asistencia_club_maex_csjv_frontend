export const HORAS_OPCIONES_LVLUP = [1, 1.5, 2, 2.5, 3];

export const TIPOS_REGISTRO_LVLUP = [
  { id: 'REGULAR', label: 'Regular' },
  { id: 'DIAGNOSTICO', label: 'Diagnóstico' },
  { id: 'INFORME_FINAL', label: 'Informe final' },
];

export function etiquetaPaquete(asignacion) {
  if (!asignacion) return '';
  if (asignacion.horas_asignadas != null && Number(asignacion.horas_asignadas) > 0) {
    return `${Number(asignacion.horas_asignadas)}h`;
  }
  if (asignacion.tipo_paquete === '3M') return '3 meses';
  return asignacion.tipo_paquete || '';
}

export function saldoDisponibleTipo(participante, tipoRegistro) {
  if (!participante?.saldo) return null;
  const s = participante.saldo;
  if (tipoRegistro === 'DIAGNOSTICO') return s.saldo_diagnostico;
  if (tipoRegistro === 'INFORME_FINAL') return s.saldo_informe;
  return s.saldo_regular;
}

export function tipoRegistroDisponible(participante, tipoId) {
  const saldo = saldoDisponibleTipo(participante, tipoId);
  if (saldo == null) return true;
  return saldo > 0;
}

export function horasPermitidasOpciones(participantes, tipoRegistro, esGrupal) {
  if (!tipoRegistro) return HORAS_OPCIONES_LVLUP;

  const lista = esGrupal ? participantes : participantes.slice(0, 1);
  if (!lista.length) return HORAS_OPCIONES_LVLUP;

  let maxPerm = Infinity;
  for (const p of lista) {
    const saldo = saldoDisponibleTipo(p, tipoRegistro);
    if (saldo != null) maxPerm = Math.min(maxPerm, saldo);
  }

  if (!Number.isFinite(maxPerm)) return HORAS_OPCIONES_LVLUP;
  return HORAS_OPCIONES_LVLUP.filter((h) => h <= maxPerm + 0.001);
}

export function textoSaldoParticipante(p) {
  const s = p?.saldo;
  if (!s) return null;
  if (s.paquete_3m) {
    const fin = s.fecha_fin_paquete ? ` · vigente hasta ${s.fecha_fin_paquete}` : '';
    return `${s.horas_usadas}h usadas${fin}`;
  }
  if (s.horas_contratadas != null) {
    return `${s.saldo_regular ?? 0}h restantes de ${s.horas_contratadas}h`;
  }
  return `${s.horas_usadas}h usadas`;
}
