/**
 * sipac_logic.ts
 *
 * Implementa la lógica matemática para el procesamiento de SIPAC:
 *   - Normalización de valores actuales/metas según el sentido (mayor mejor / menor mejor)
 *   - Cálculo del gap relativo, acotado a [-1, 0]
 *   - Agregación por artefactos: V (calidad) y W (impacto) como salidas estratégicas
 *     principales para la clasificación en la matriz 2×2 de SIPAC; X como índice
 *     auxiliar de necesidad global.
 *
 */

export interface SipacIndicador {
  nombre: string;
  tipo: number;      // 1 = calidad, 2 = impacto
  minimo: number;
  maximo: number;
  sentido: number;   // 1 = mayor mejor, otro = menor mejor
  actual: number;
  meta: number;
}

export interface SipacIndicadorResult extends SipacIndicador {
  S_actual: number;   // normalización del valor actual en [0,1]
  T_meta: number;     // normalización del valor meta en [0,1]
  U_gap: number;      // gap relativo actual → meta
}

export interface SipacArtefacto {
  artefacto: string;
  indicadores: SipacIndicador[];
}

export interface SipacActivo {
  activo_especifico: string;
  gia_tipo: string;
  importancia_activo: number;
  intellectus_ci: string[];
  artefactos: SipacArtefacto[];
  bmc_block?: string;
}

export interface SipacProceso {
  Proceso: string;
  Activos: SipacActivo[];
}

export type SipacQuadrant = 'stable' | 'evolving' | 'replaceable' | 'warning';

export interface SipacScoreResult {
  results: SipacIndicadorResult[];
  V_calidad: number | null;
  W_impacto: number | null;
  X_final: number | null;
}

/**
 * Normaliza un valor en [0,1] respecto a [min, max] teniendo en cuenta sentido.
 *
 * Fórmula:
 *   sentido=1 (mayor mejor): S = (valor - min) / (max - min)
 *   sentido≠1 (menor mejor): S = (valor - max) / (min - max) / (-1)
 *                               = (max - valor) / (max - min)
 */
export function normalize(valor: number, min: number, max: number, sentido: number): number {
  if (max === min) return 0;
  if (sentido === 1) {
    return (valor - min) / (max - min);
  } else {
    return (max - valor) / (max - min);
  }
}

/**
 * Calcula el gap relativo de un indicador.
 *
 *   sentido=1: U = (S - T) / T     si T=0 → U=-1
 *   sentido≠1: U = (S - T) / S     si S=0 → U=-1
 *
 * La elección del denominador es semántica, no un ajuste de dirección:
 *   - sentido=1: T es la base de referencia (la meta es el techo); el gap mide
 *     qué fracción de la distancia hasta la meta aún falta por cubrir.
 *   - sentido≠1: S es la base de referencia (el estado actual es el punto de partida);
 *     el gap mide cuánto por encima del valor actual se encuentra la meta.
 *
 * Diseño: U se acota superiormente a 0. Si S ≥ T (meta ya cumplida), U=0.
 * Razón: SIPAC mide únicamente la brecha hacia la meta; permitir U>0 (superávit)
 * distorsionaría los promedios al compensar artificialmente indicadores críticos.
 */
export function calcGap(S: number, T: number, sentido: number): number {
  if (sentido === 1) {
    const raw = T === 0 ? -1 : (S - T) / T;
    return Math.min(0, raw);
  } else {
    const raw = S === 0 ? -1 : (S - T) / S;
    return Math.min(0, raw);
  }
}

/**
 * Calcula los scores SIPAC para un array de indicadores.
 * Devuelve también V (calidad), W (impacto), X (final).
 */
export function calcSipacScores(indicadores: SipacIndicador[]): SipacScoreResult {
  const results: SipacIndicadorResult[] = indicadores.map(ind => {
    const S = normalize(ind.actual, ind.minimo, ind.maximo, ind.sentido);
    const T = normalize(ind.meta, ind.minimo, ind.maximo, ind.sentido);
    const U = calcGap(S, T, ind.sentido);
    return { ...ind, S_actual: S, T_meta: T, U_gap: U };
  });

  const calidad = results.filter(r => r.tipo === 1);
  const impacto = results.filter(r => r.tipo === 2);

  const V = calidad.length > 0
    ? calidad.reduce((s, r) => s + r.U_gap, 0) / calidad.length
    : null;

  const W = impacto.length > 0
    ? impacto.reduce((s, r) => s + r.U_gap, 0) / impacto.length
    : null;

  // X: si solo hay un tipo, usa ese; si hay ambos, promedia todos los U
  let X: number | null = null;
  if (V === null && W !== null) X = W;
  else if (W === null && V !== null) X = V;
  else if (V !== null && W !== null) {
    X = results.reduce((s, r) => s + r.U_gap, 0) / results.length;
  }

  return { results, V_calidad: V, W_impacto: W, X_final: X };
}

/**
 * Clasifica un artefacto en uno de los cuatro cuadrantes de la matriz SIPAC
 * en función de sus puntuaciones promedio de calidad (V) e impacto (W).
 *
 * Basado en la metodología oficial de SIPAC (Sanchez-Segura et al., IMDS 2017):
 *   - Estable (stable): V >= threshold && W >= threshold
 *   - En evolución (evolving): V < threshold && W >= threshold
 *   - Reemplazable (replaceable): V >= threshold && W < threshold
 *   - De advertencia (warning): V < threshold && W < threshold
 *
 * threshold por defecto es -0.5 (mitad del rango de gaps [-1, 0]).
 */
export function classifySipacQuadrant(
  V: number | null,
  W: number | null,
  threshold = -0.5
): SipacQuadrant | null {
  if (V === null || W === null) return null;

  const satisfactory = V >= threshold;
  const significant = W >= threshold;

  if (satisfactory && significant) return 'stable';
  if (!satisfactory && significant) return 'evolving';
  if (satisfactory && !significant) return 'replaceable';
  return 'warning';
}
