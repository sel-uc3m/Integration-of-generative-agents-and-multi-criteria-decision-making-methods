/**
 * altus_logic.ts
 *
 * Implementa la lógica matemática EXACTA para el procesamiento de ALTUS
 *   - 7 Niveles Arquitectónicos (Configuración, Formación, Operacional, Proactivo, Valoración SP3, Social, Memoria Transactiva)
 *   - 4 Niveles de Madurez ML1 (100 pts), ML2 (50 pts), ML3 (55 pts), ML4 (50 pts) = 255 pts total
 *   - Clasificación de Estado: BAD (0-1), MID (2-3), GOOD (4-5)
 *   - Cobertura de Niveles Arquitectónicos vs Techo Máximo
 *   - Distribución y Evolución del Modelo ALTUS (Balanced ScoreCard)
 */

export interface AltusCapacidad {
  key: string;        // e.g. "1_CONF:1", "record:1_CONF:1", "CONF 1"
  score: number;      // 0-5
  name?: string;
  fullName?: string;
  justification?: string;
  question?: string;
}

export type AltusArchCode = 'CONF' | 'FORM' | 'OPER' | 'PRO' | 'VAL' | 'SOCI' | 'MEMO';
export type AltusLikertStatus = 'BAD' | 'MID' | 'GOOD';

export interface ArchLevelMeta {
  code: AltusArchCode;
  name: string;
  enName: string;
  order: number;
}

export const ALTUS_ARCHITECTURAL_LEVELS: ArchLevelMeta[] = [
  { code: "CONF", name: "Configuración", enName: "Configuration", order: 1 },
  { code: "FORM", name: "Formación", enName: "Training", order: 2 },
  { code: "OPER", name: "Operacional", enName: "Operative", order: 3 },
  { code: "PRO",  name: "Proactivo", enName: "Proactive", order: 4 },
  { code: "VAL",  name: "Valoración SP3", enName: "SP3 valuation", order: 5 },
  { code: "SOCI", name: "Social", enName: "Social", order: 6 },
  { code: "MEMO", name: "Memoria Transactiva", enName: "Transactive Memory", order: 7 },
];

export const ALTUS_CAPABILITIES_CONFIG: Record<string, {
  maxTotal: number;
  capabilitiesCount: number;
  byArch: Record<AltusArchCode, { count: number; maxScore: number }>;
}> = {
  ML1: {
    maxTotal: 100,
    capabilitiesCount: 20,
    byArch: {
      CONF: { count: 7, maxScore: 35 },
      FORM: { count: 2, maxScore: 10 },
      OPER: { count: 1, maxScore: 5 },
      PRO:  { count: 2, maxScore: 10 },
      VAL:  { count: 4, maxScore: 20 },
      SOCI: { count: 1, maxScore: 5 },
      MEMO: { count: 3, maxScore: 15 },
    }
  },
  ML2: {
    maxTotal: 50,
    capabilitiesCount: 10,
    byArch: {
      CONF: { count: 1, maxScore: 5 },
      FORM: { count: 2, maxScore: 10 },
      OPER: { count: 0, maxScore: 0 },
      PRO:  { count: 1, maxScore: 5 },
      VAL:  { count: 2, maxScore: 10 },
      SOCI: { count: 1, maxScore: 5 },
      MEMO: { count: 3, maxScore: 15 },
    }
  },
  ML3: {
    maxTotal: 55,
    capabilitiesCount: 11,
    byArch: {
      CONF: { count: 3, maxScore: 15 },
      FORM: { count: 2, maxScore: 10 },
      OPER: { count: 0, maxScore: 0 },
      PRO:  { count: 1, maxScore: 5 },
      VAL:  { count: 3, maxScore: 15 },
      SOCI: { count: 2, maxScore: 10 },
      MEMO: { count: 0, maxScore: 0 },
    }
  },
  ML4: {
    maxTotal: 50,
    capabilitiesCount: 10,
    byArch: {
      CONF: { count: 1, maxScore: 5 },
      FORM: { count: 1, maxScore: 5 },
      OPER: { count: 0, maxScore: 0 },
      PRO:  { count: 4, maxScore: 20 },
      VAL:  { count: 2, maxScore: 10 },
      SOCI: { count: 1, maxScore: 5 },
      MEMO: { count: 1, maxScore: 5 },
    }
  },
  TOTAL: {
    maxTotal: 255,
    capabilitiesCount: 51,
    byArch: {
      CONF: { count: 12, maxScore: 60 },
      FORM: { count: 7,  maxScore: 35 },
      OPER: { count: 1,  maxScore: 5 },
      PRO:  { count: 8,  maxScore: 40 },
      VAL:  { count: 11, maxScore: 55 },
      SOCI: { count: 5,  maxScore: 25 },
      MEMO: { count: 7,  maxScore: 35 },
    }
  }
};

export const ALTUS_ACTION_RECOMMENDATIONS = [
  {
    range: "0.0",
    label: "Sin Evidencia (0)",
    evidenceAction: "No existen evidencias, debe definir mecanismos para implementar las capacidades y poder generar evidencias.",
    toolAction: "No existen evidencias, debe implementar herramientas tecnológicas adecuadas para este nivel arquitectónico.",
    color: "rose"
  },
  {
    range: "1 - 2",
    label: "Deficiente / Básico (1-2)",
    evidenceAction: "Redefinir los mecanismos de creación y representación de evidencias que tiene actualmente.",
    toolAction: "Cambiar las herramientas tecnológicas seleccionadas o mejorar las existentes para que se adecúen a las necesidades de este nivel arquitectónico.",
    color: "amber"
  },
  {
    range: "3 - 4",
    label: "Intermedio / Bueno (3-4)",
    evidenceAction: "Mejorar los mecanismos de creación y representación de evidencias que tiene actualmente.",
    toolAction: "Mejorar la funcionalidad de las herramientas tecnológicas existentes para que se adecúen mejor a las necesidades de este nivel arquitectónico.",
    color: "sky"
  },
  {
    range: "5",
    label: "Optimizado (5)",
    evidenceAction: "Mantener en un ciclo de mejora continua los mecanismos de creación y representación de evidencias que tiene actualmente.",
    toolAction: "Mantener un proceso de mejora continua de las herramientas tecnológicas existentes.",
    color: "emerald"
  }
];

export interface AltusMlAnalysis {
  ml: number;
  name: string;
  reachedScore: number;
  maxScore: number;
  achievement: number; // percentage (0 - 100)
  statusCounts: {
    bad: number;
    mid: number;
    good: number;
    total: number;
  };
  statusPcts: {
    bad: number;
    mid: number;
    good: number;
  };
  archLevels: Array<{
    code: AltusArchCode;
    name: string;
    enName: string;
    reached: number;
    max: number;
    coveragePct: number;
    avgLikert: number;
    count: number;
  }>;
}

export interface AltusAnalysis {
  byDimension: Record<string, {
    capacidades: Array<{ key: string; score: number; nivel: number; status: AltusLikertStatus }>;
    avg: number;
    counts: Record<number, number>;
    proportions: Record<number, number>;
  }>;
  totalByLevel: Record<number, number>;
  totalCapacidades: number;

  // Extended analytics
  mlSummaries: AltusMlAnalysis[];
  globalSummary: {
    totalReached: number;
    totalMax: number;
    globalAchievement: number;
    globalAvgLikert: number;
    statusCounts: { bad: number; mid: number; good: number; total: number };
    archLevels: Array<{
      code: AltusArchCode;
      name: string;
      enName: string;
      reached: number;
      max: number;
      coveragePct: number;
      avgLikert: number;
      count: number;
    }>;
  };
  balancedScoreCard: {
    evolution: Array<{
      name: string;
      enName: string;
      code: AltusArchCode;
      ML1: number;
      ML2: number;
      ML3: number;
      ML4: number;
      rawCounts: Record<string, number>;
    }>;
    distributionByMl: Array<{
      ml: string;
      name: string;
      total: number;
      [key: string]: any;
    }>;
    actions: typeof ALTUS_ACTION_RECOMMENDATIONS;
  };
}

/**
 * Clasifica un score en nivel de madurez (1-4).
 */
export function classifyLevel(score: number): 1 | 2 | 3 | 4 {
  if (score <= 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  return 4;
}

/**
 * Clasifica un score Likert (0-5) en estado de salud:
 * - BAD: 0 ó 1
 * - MID: 2 ó 3
 * - GOOD: 4 ó 5
 */
export function classifyLikertStatus(score: number): AltusLikertStatus {
  if (score <= 1) return 'BAD';
  if (score === 2 || score === 3) return 'MID';
  return 'GOOD';
}

/**
 * Parsea el código de dimensión y el nivel de madurez desde una clave de capacidad.
 */
export function parseAltusKey(rawKey: string): { dim: AltusArchCode; ml: number; cleanId: string } {
  const cleanKey = rawKey.replace(/^record:/, '').trim();

  // Patterns like "1_CONF:1", "2_FORM:3", "CONF 1", "VAL 10"
  let ml = 1;
  let dim: AltusArchCode = 'CONF';

  const matchUnder = cleanKey.match(/^(\d+)_([A-Z0-9]+):(\d+)$/);
  if (matchUnder) {
    ml = parseInt(matchUnder[1], 10);
    const codeCandidate = matchUnder[2] as AltusArchCode;
    if (ALTUS_ARCHITECTURAL_LEVELS.some(a => a.code === codeCandidate)) {
      dim = codeCandidate;
    }
    return { dim, ml, cleanId: cleanKey };
  }

  // Handle space or colon patterns e.g. "CONF 8", "FORM:2"
  const upper = cleanKey.toUpperCase();
  if (upper.includes("CONF") || upper.includes("C_")) dim = "CONF";
  else if (upper.includes("FORM") || upper.includes("T_")) dim = "FORM";
  else if (upper.includes("OPER") || upper.includes("O_")) dim = "OPER";
  else if (upper.includes("PRO") || upper.includes("P_")) dim = "PRO";
  else if (upper.includes("SOCI") || upper.includes("S_")) dim = "SOCI";
  else if (upper.includes("VAL") || upper.includes("SP3")) dim = "VAL";
  else if (upper.includes("MEMO") || upper.includes("TM")) dim = "MEMO";

  if (upper.startsWith("2_") || upper.startsWith("2-") || upper.includes("ML2")) ml = 2;
  else if (upper.startsWith("3_") || upper.startsWith("3-") || upper.includes("ML3")) ml = 3;
  else if (upper.startsWith("4_") || upper.startsWith("4-") || upper.includes("ML4")) ml = 4;
  else {
    // Check specific capability IDs if standard numbering
    const numMatch = cleanKey.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (dim === "CONF") {
        if (num <= 7) ml = 1;
        else if (num === 8) ml = 2;
        else if (num >= 9 && num <= 12 && num !== 11) ml = 3;
        else if (num === 11) ml = 4;
      } else if (dim === "FORM") {
        if (num <= 2) ml = 1;
        else if (num <= 4) ml = 2;
        else if (num <= 6) ml = 3;
        else ml = 4;
      } else if (dim === "PRO") {
        if (num <= 2) ml = 1;
        else if (num === 3) ml = 2;
        else if (num === 4) ml = 3;
        else ml = 4;
      } else if (dim === "VAL") {
        if (num <= 4) ml = 1;
        else if (num <= 6) ml = 2;
        else if (num <= 9) ml = 3;
        else ml = 4;
      } else if (dim === "SOCI") {
        if (num === 1) ml = 1;
        else if (num === 2) ml = 2;
        else if (num <= 4) ml = 3;
        else ml = 4;
      } else if (dim === "MEMO") {
        if (num <= 3) ml = 1;
        else if (num <= 6) ml = 2;
        else ml = 4;
      }
    }
  }

  return { dim, ml, cleanId: cleanKey };
}

/**
 * Calcula los promedios, conteos y métricas completas de ALTUS
 */
export function calcAltusScores(capacidades: AltusCapacidad[]): AltusAnalysis {
  const byDim: Record<string, Array<{ key: string; score: number; nivel: number; status: AltusLikertStatus }>> = {};
  const normalizedCaps: Array<{ key: string; score: number; ml: number; dim: AltusArchCode; status: AltusLikertStatus }> = [];

  for (const cap of capacidades) {
    const { dim, ml, cleanId } = parseAltusKey(cap.key);
    const status = classifyLikertStatus(cap.score);
    const nivel = classifyLevel(cap.score);

    normalizedCaps.push({ key: cleanId, score: cap.score, ml, dim, status });

    if (!byDim[dim]) byDim[dim] = [];
    byDim[dim].push({ key: cleanId, score: cap.score, nivel, status });
  }

  const totalByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const byDimResult: AltusAnalysis['byDimension'] = {};

  for (const [dim, caps] of Object.entries(byDim)) {
    const avg = caps.reduce((s, c) => s + c.score, 0) / (caps.length || 1);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const c of caps) {
      counts[c.nivel]++;
      totalByLevel[c.nivel]++;
    }
    const proportions: Record<number, number> = {};
    for (const lvl of [1, 2, 3, 4]) {
      proportions[lvl] = caps.length > 0 ? counts[lvl] / caps.length : 0;
    }
    byDimResult[dim] = { capacidades: caps, avg, counts, proportions };
  }

  // 1. Compute ML Summaries (ML1, ML2, ML3, ML4)
  const mlSummaries: AltusMlAnalysis[] = [1, 2, 3, 4].map(ml => {
    const cfg = ALTUS_CAPABILITIES_CONFIG[`ML${ml}`];
    const mlCaps = normalizedCaps.filter(c => c.ml === ml);
    const reachedScore = mlCaps.reduce((sum, c) => sum + c.score, 0);
    const maxScore = cfg ? cfg.maxTotal : mlCaps.length * 5;
    const achievement = maxScore > 0 ? (reachedScore / maxScore) * 100 : 0;

    const bad = mlCaps.filter(c => c.status === 'BAD').length;
    const mid = mlCaps.filter(c => c.status === 'MID').length;
    const good = mlCaps.filter(c => c.status === 'GOOD').length;
    const total = mlCaps.length;

    const names = [
      "Nivel 1 (Inicial)",
      "Nivel 2 (En Desarrollo)",
      "Nivel 3 (Definido)",
      "Nivel 4 (Optimizado)"
    ];

    const archLevels = ALTUS_ARCHITECTURAL_LEVELS.map(arch => {
      const archCaps = mlCaps.filter(c => c.dim === arch.code);
      const reached = archCaps.reduce((sum, c) => sum + c.score, 0);
      const expectedCfg = cfg?.byArch?.[arch.code];
      const max = expectedCfg ? expectedCfg.maxScore : archCaps.length * 5;
      const count = expectedCfg ? expectedCfg.count : archCaps.length;
      const coveragePct = max > 0 ? (reached / max) * 100 : 0;
      const avgLikert = count > 0 ? reached / count : 0;

      return {
        code: arch.code,
        name: arch.name,
        enName: arch.enName,
        reached,
        max,
        coveragePct,
        avgLikert,
        count
      };
    });

    return {
      ml,
      name: names[ml - 1],
      reachedScore,
      maxScore,
      achievement,
      statusCounts: { bad, mid, good, total },
      statusPcts: {
        bad: total > 0 ? (bad / total) * 100 : 0,
        mid: total > 0 ? (mid / total) * 100 : 0,
        good: total > 0 ? (good / total) * 100 : 0,
      },
      archLevels
    };
  });

  // 2. Compute Global Summary across all ML
  const totalReached = normalizedCaps.reduce((sum, c) => sum + c.score, 0);
  const totalMax = ALTUS_CAPABILITIES_CONFIG.TOTAL.maxTotal;
  const globalAchievement = totalMax > 0 ? (totalReached / totalMax) * 100 : 0;
  const globalAvgLikert = normalizedCaps.length > 0 ? totalReached / normalizedCaps.length : 0;

  const badGlobal = normalizedCaps.filter(c => c.status === 'BAD').length;
  const midGlobal = normalizedCaps.filter(c => c.status === 'MID').length;
  const goodGlobal = normalizedCaps.filter(c => c.status === 'GOOD').length;

  const globalArchLevels = ALTUS_ARCHITECTURAL_LEVELS.map(arch => {
    const archCaps = normalizedCaps.filter(c => c.dim === arch.code);
    const reached = archCaps.reduce((sum, c) => sum + c.score, 0);
    const max = ALTUS_CAPABILITIES_CONFIG.TOTAL.byArch[arch.code]?.maxScore || (archCaps.length * 5);
    const count = ALTUS_CAPABILITIES_CONFIG.TOTAL.byArch[arch.code]?.count || archCaps.length;
    const coveragePct = max > 0 ? (reached / max) * 100 : 0;
    const avgLikert = count > 0 ? reached / count : 0;

    return {
      code: arch.code,
      name: arch.name,
      enName: arch.enName,
      reached,
      max,
      coveragePct,
      avgLikert,
      count
    };
  });

  // 3. Balanced ScoreCard Evolution (Capabilities distribution across MLs per dimension)
  const evolution = ALTUS_ARCHITECTURAL_LEVELS.map(arch => {
    const totalCount = ALTUS_CAPABILITIES_CONFIG.TOTAL.byArch[arch.code].count;
    const ml1Count = ALTUS_CAPABILITIES_CONFIG.ML1.byArch[arch.code].count;
    const ml2Count = ALTUS_CAPABILITIES_CONFIG.ML2.byArch[arch.code].count;
    const ml3Count = ALTUS_CAPABILITIES_CONFIG.ML3.byArch[arch.code].count;
    const ml4Count = ALTUS_CAPABILITIES_CONFIG.ML4.byArch[arch.code].count;

    return {
      name: arch.name,
      enName: arch.enName,
      code: arch.code,
      ML1: totalCount > 0 ? Math.round((ml1Count / totalCount) * 1000) / 10 : 0,
      ML2: totalCount > 0 ? Math.round((ml2Count / totalCount) * 1000) / 10 : 0,
      ML3: totalCount > 0 ? Math.round((ml3Count / totalCount) * 1000) / 10 : 0,
      ML4: totalCount > 0 ? Math.round((ml4Count / totalCount) * 1000) / 10 : 0,
      rawCounts: { ML1: ml1Count, ML2: ml2Count, ML3: ml3Count, ML4: ml4Count, total: totalCount }
    };
  });

  // 4. Balanced ScoreCard Distribution (Architectural levels distribution within each ML)
  const distributionByMl = (['ML1', 'ML2', 'ML3', 'ML4'] as const).map(mlKey => {
    const cfg = ALTUS_CAPABILITIES_CONFIG[mlKey];
    const total = cfg.capabilitiesCount;
    const item: any = {
      ml: mlKey,
      name: `Nivel ${mlKey.replace('ML', '')}`,
      total
    };

    ALTUS_ARCHITECTURAL_LEVELS.forEach(arch => {
      const c = cfg.byArch[arch.code].count;
      item[arch.name] = total > 0 ? Math.round((c / total) * 1000) / 10 : 0;
      item[arch.code] = item[arch.name];
    });

    return item;
  });

  return {
    byDimension: byDimResult,
    totalByLevel,
    totalCapacidades: normalizedCaps.length,
    mlSummaries,
    globalSummary: {
      totalReached,
      totalMax,
      globalAchievement,
      globalAvgLikert,
      statusCounts: {
        bad: badGlobal,
        mid: midGlobal,
        good: goodGlobal,
        total: normalizedCaps.length
      },
      archLevels: globalArchLevels
    },
    balancedScoreCard: {
      evolution,
      distributionByMl,
      actions: ALTUS_ACTION_RECOMMENDATIONS
    }
  };
}
