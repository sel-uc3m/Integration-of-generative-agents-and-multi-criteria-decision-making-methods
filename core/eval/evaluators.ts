import fs from "node:fs";
import path from "node:path";
import {
  GroundTruthCase,
  GroundTruthCapacity,
  AltusEvalResult,
  SipacEvalResult,
  AhpEvalResult,
  SoftFieldMetrics,
} from "./types.js";
import {
  AltusFollowUpQualityOutput,
  AltusFollowUpQualitySchema,
  AhpCriteriaEvaluationOutput,
  AhpCriteriaEvaluationSchema,
} from "./schemas.js";
import {
  buildAltusFollowUpQualityPrompt,
  buildAhpCriteriaPrompt,
} from "./prompts.js";
import { EVAL_CONFIG, EVAL_PATHS, invokeStructuredJudge } from "./config.js";
import { evaluateFieldMatching } from "./scoring.js";
import { simulateStakeholder } from "./simulator.js";
import { createGraph, createInitialState, loadSession } from "../src/index.js";
import { setDynamicResponses } from "../src/scripted.js";

// ==========================================
// 1. Carga y Resolución de Ground Truth
// ==========================================

export function loadGroundTruthCase(caseIdOrName: string): GroundTruthCase {
  const normalized = caseIdOrName.endsWith(".json") ? caseIdOrName : `${caseIdOrName}.json`;
  const filePath = path.join(EVAL_PATHS.groundTruthDir, normalized);

  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el caso Ground Truth en: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function loadAllGroundTruthCases(filterTerms: string[] = []): GroundTruthCase[] {
  if (!fs.existsSync(EVAL_PATHS.groundTruthDir)) {
    throw new Error(`No se encontró el directorio de Ground Truth: ${EVAL_PATHS.groundTruthDir}`);
  }

  let files = fs.readdirSync(EVAL_PATHS.groundTruthDir).filter((f) => f.endsWith(".json"));
  if (filterTerms.length > 0) {
    files = files.filter((f) => filterTerms.some((t) => f.toLowerCase().includes(t.toLowerCase())));
  }

  return files.map((file) => JSON.parse(fs.readFileSync(path.join(EVAL_PATHS.groundTruthDir, file), "utf-8")));
}

export function getSipacGroundTruthResponse(actionId: string, gtCase: GroundTruthCase): string {
  const sipac = gtCase.sipac;
  const companyName = gtCase.companyName;

  switch (actionId) {
    case "STEP_0_EMPRESA":
      return `Nombre: ${companyName}. Descripción: ${gtCase.description || companyName}. Misión principal: Desarrollar la actividad comercial y digitalizarnos eficientemente.`;
    case "STEP_1_OBJETIVOS":
      if (sipac?.procesos && sipac.procesos.length > 0) {
        return `Los objetivos de negocio clave son: ${sipac.procesos.map((p) => p.nombre).join("; ")}.`;
      }
      return `Los objetivos principales de ${companyName} son expandir la presencia digital, optimizar procesos e incrementar la satisfacción de clientes.`;
    case "STEP_2_REQUISITOS":
      return `Requisitos de negocio de ${companyName}: Sincronización en tiempo real de inventarios, sistematización de captación y fidelización y formalización de conocimiento.`;
    case "STEP_3_PROCESOS":
      if (sipac?.procesos && sipac.procesos.length > 0) {
        return `Los procesos organizacionales clave son:\n${sipac.procesos.map((p, i) => `${i + 1}. [${p.id}] ${p.nombre}`).join("\n")}`;
      }
      return `Procesos principales en ${companyName}: Canal comercial e-commerce, gestión de almacén y atención al cliente.`;
    case "STEP_5_VALIDAR_ACTIVOS_IMPORTANCIA":
      if (sipac?.activosGIA && sipac.activosGIA.length > 0) {
        return `Los activos intangibles clave identificados para ${companyName} son:\n${sipac.activosGIA.map((a) => `- ${a.activoIntangibleNombre || a.giaNombre}`).join("\n")}`;
      }
      return `Activos clave de ${companyName}: Know-how del producto, marca y relaciones comerciales.`;
    case "STEP_7_VALIDAR_ARTEFACTOS":
      if (sipac?.artefactos && sipac.artefactos.length > 0) {
        return `Los artefactos tecnológicos y documentales asociados son:\n${sipac.artefactos.map((a) => `- ${a.artefactoNombre}`).join("\n")}`;
      }
      return `Artefactos principales: Plataforma TPV/ERP, tienda online y canal de gestión de clientes.`;
    case "STEP_9_MEDICION_EXACTA":
      if (sipac?.indicadores && sipac.indicadores.length > 0) {
        return `Los indicadores y KPIs de medición identificados son:\n${sipac.indicadores.map((i) => `- ${i.indicadorNombre}`).join("\n")}`;
      }
      return `Indicadores principales: Tasa de conversión, rotación de inventarios y satisfacción del cliente.`;
    default:
      return `Información corporativa del dossier oficial de ${companyName}: ${gtCase.companyFullContext}`;
  }
}

export function getAhpGroundTruthResponse(actionId: string, gtCase: GroundTruthCase): string {
  if (actionId === "STEP_2_CONFIRM_CRITERIA") {
    return "Sí, estoy de acuerdo con usar estos criterios para el modelo matemático AHP.";
  }
  return `Contexto de priorización AHP y artefactos para la empresa ${gtCase.companyName}: ${gtCase.description || gtCase.companyName}.`;
}

// ==========================================
// 2. Extractor de Entidades SIPAC
// ==========================================

export interface ExtractedSipacEntities {
  gia: string[];
  activosIntangibles: string[];
  intellectusCi: string[];
  artefactos: string[];
  indicadores: string[];
}

export function extractSipacEntities(outputJson: Record<string, any>): ExtractedSipacEntities {
  const giaSet = new Set<string>();
  const aiSet = new Set<string>();
  const ciSet = new Set<string>();
  const artefactosSet = new Set<string>();
  const indicadoresSet = new Set<string>();

  const variableSources = [
    outputJson.sipac_final_output,
    outputJson.sipac_pre_final_output,
    outputJson.medicion_exacta_indicadores,
    outputJson.medicion_exacta_final,
    outputJson.indicadores_propuestos,
    outputJson.activos_artefactos_final,
    outputJson.activos_ci_artefactos,
    outputJson.activos_confirmados_importancia,
    outputJson.activos_propuestos,
  ];

  const processObject = (obj: any) => {
    if (!obj || typeof obj !== "object") return;

    if (obj.gia_tipo !== undefined && obj.gia_tipo !== null) giaSet.add(`GIA ${obj.gia_tipo}`);
    else if (obj.GIA !== undefined && obj.GIA !== null) giaSet.add(`GIA ${obj.GIA}`);

    const aiName = obj.activo_especifico || obj.activo_intangible || obj.Actividad || obj.activo;
    if (aiName && typeof aiName === "string") aiSet.add(aiName.trim());

    const ci = obj.intellectus_ci || obj.capital_intelectual || obj.intellectus;
    if (ci) {
      if (Array.isArray(ci)) {
        for (const c of ci) {
          if (typeof c === "string") ciSet.add(c.trim());
          else if (c && typeof c === "object") {
            const cName = c.nombre || c.tipo || c.capital;
            if (cName && typeof cName === "string") ciSet.add(cName.trim());
          }
        }
      } else if (typeof ci === "string") {
        ciSet.add(ci.trim());
      } else if (typeof ci === "object") {
        const cName = (ci as any).nombre || (ci as any).tipo || (ci as any).capital;
        if (cName && typeof cName === "string") ciSet.add(cName.trim());
      }
    }

    const arts = obj.artefactos_propuestos || obj.artefactos || obj.artefacto;
    if (Array.isArray(arts)) {
      for (const art of arts) {
        if (typeof art === "string") {
          artefactosSet.add(art.trim());
        } else if (art && typeof art === "object") {
          const name = art.artefacto || art.nombre || art.artefactoNombre;
          if (name && typeof name === "string") artefactosSet.add(name.trim());
          processObject(art);
        }
      }
    } else if (typeof arts === "string") {
      artefactosSet.add(arts.trim());
    } else if (arts && typeof arts === "object") {
      const name = arts.artefacto || arts.nombre || arts.artefactoNombre;
      if (name && typeof name === "string") artefactosSet.add(name.trim());
      processObject(arts);
    }

    const inds = obj.indicadores || obj.medicion_exacta || obj.kpis || obj.indicador;
    if (Array.isArray(inds)) {
      for (const ind of inds) {
        if (typeof ind === "string") indicadoresSet.add(ind.trim());
        else if (ind && typeof ind === "object") {
          const name = ind.nombre || ind.descripcion || ind.indicador || ind.indicadorNombre;
          if (name && typeof name === "string") indicadoresSet.add(name.trim());
        }
      }
    } else if (typeof inds === "string" && (obj.actual !== undefined || obj.meta !== undefined || obj.bmc_block !== undefined || obj.tipo !== undefined)) {
      indicadoresSet.add(inds.trim());
    } else if (inds && typeof inds === "object") {
      const name = inds.nombre || inds.descripcion || inds.indicador || inds.indicadorNombre;
      if (name && typeof name === "string") indicadoresSet.add(name.trim());
    } else if (obj.nombre && typeof obj.nombre === "string" && (obj.actual !== undefined || obj.meta !== undefined || obj.bmc_block !== undefined || obj.tipo !== undefined)) {
      indicadoresSet.add(obj.nombre.trim());
    }

    // Recurse into all nested objects and arrays
    for (const [k, v] of Object.entries(obj)) {
      if (k !== "partial" && k !== "summary" && k !== "complete_answer" && typeof v === "object" && v !== null) {
        if (Array.isArray(v)) {
          for (const item of v) processObject(item);
        } else {
          processObject(v);
        }
      }
    }
  };

  for (const source of variableSources) {
    if (!source) continue;
    const blocks = Array.isArray(source) ? source : [source];
    for (const block of blocks) {
      processObject(block);
    }
  }

  // Regex fallback por campo individual
  const jsonStr = JSON.stringify(outputJson || {});
  if (giaSet.size === 0) {
    for (const m of jsonStr.matchAll(/"(?:gia_tipo|GIA)"\s*:\s*"?(\d+)"?/gi)) giaSet.add(`GIA ${m[1]}`);
  }
  if (aiSet.size === 0) {
    for (const m of jsonStr.matchAll(/"(?:activo_especifico|activo_intangible|Actividad)"\s*:\s*"([^"]+)"/gi)) aiSet.add(m[1].trim());
  }
  if (ciSet.size === 0) {
    for (const m of jsonStr.matchAll(/"(?:capital_intelectual|intellectus_ci|intellectus)"\s*:\s*"([^"]+)"/gi)) ciSet.add(m[1].trim());
    for (const arrMatch of jsonStr.matchAll(/"intellectus_ci"\s*:\s*\[([^\]]+)\]/gi)) {
      const items = arrMatch[1].match(/"([^"]+)"/g);
      if (items) for (const it of items) ciSet.add(it.replace(/"/g, "").trim());
    }
  }
  if (artefactosSet.size === 0) {
    for (const m of jsonStr.matchAll(/"artefactos_propuestos"\s*:\s*\[\s*"([^"]+)"/gi)) artefactosSet.add(m[1].trim());
    for (const m of jsonStr.matchAll(/"(?:artefo|artefacto|artefactos)"\s*:\s*"([^"]+)"/gi)) artefactosSet.add(m[1].trim());
  }
  if (indicadoresSet.size === 0) {
    for (const m of jsonStr.matchAll(/"(?:descripcion|nombre|indicador)"\s*:\s*"([^"]+)"/gi)) indicadoresSet.add(m[1].trim());
  }

  return {
    gia: Array.from(giaSet),
    activosIntangibles: Array.from(aiSet),
    intellectusCi: Array.from(ciSet),
    artefactos: Array.from(artefactosSet),
    indicadores: Array.from(indicadoresSet),
  };
}

// ==========================================
// 3. Módulo ALTUS
// ==========================================

export function scoreAltusOutput(
  outputJson: Record<string, any>,
  capacities: GroundTruthCapacity[]
): { accuracy: number; mae: number; correctCount: number; totalCount: number } {
  const n = capacities.length;
  if (n === 0) return { accuracy: 1.0, mae: 0, correctCount: 0, totalCount: 0 };

  let totalError = 0;
  let correctCount = 0;

  for (let i = 0; i < n; i++) {
    const cap = capacities[i];
    const capId = cap.capacityId || (cap as any).key || "";
    const possibleKeys = [
      capId,
      `1_${capId.replace(/\s+/g, ":")}`,
      `2_${capId.replace(/\s+/g, ":")}`,
      `3_${capId.replace(/\s+/g, ":")}`,
      `4_${capId.replace(/\s+/g, ":")}`,
      `${i + 1}`,
    ];

    let graphResult: any = null;
    for (const k of possibleKeys) {
      if (k && outputJson[k]) {
        graphResult = outputJson[k];
        break;
      }
    }

    let predictedScore = 0;
    if (graphResult && typeof graphResult === "object") {
      if (typeof graphResult.qualification === "number") predictedScore = graphResult.qualification;
      else if (typeof graphResult.score === "number") predictedScore = graphResult.score;
    }

    const err = Math.abs(predictedScore - cap.expectedScore);
    totalError += err;
    if (err === 0) correctCount++;
  }

  return {
    accuracy: Number((correctCount / n).toFixed(3)),
    mae: Number((totalError / n).toFixed(3)),
    correctCount,
    totalCount: n,
  };
}

export async function evaluateAltusFollowUpQualityWithJudge(params: {
  capacityName: string;
  originalQuestion: string;
  capacityContext: string;
  localThreadHistory: string;
  agentFollowUpQuestion: string;
}): Promise<AltusFollowUpQualityOutput> {
  const prompt = buildAltusFollowUpQualityPrompt(params);

  try {
    return await invokeStructuredJudge({
      schema: AltusFollowUpQualitySchema,
      prompt,
      description: "Juez ALTUS Follow-up",
      preprocessor: (parsed) => {
        if (!parsed.reasoning && (parsed.justification || parsed.reason || parsed.explanation)) {
          parsed.reasoning = parsed.justification || parsed.reason || parsed.explanation;
        }
        return parsed;
      },
    });
  } catch (e) {
    console.warn("[Judge ALTUS] Fallaron los reintentos:", e);
    return { score: 1, reasoning: "Fallback score (generic question assumed)." };
  }
}

/**
 * Finds the matching Ground Truth capacity using taskId, actionId, or numeric index.
 */
export function findGroundTruthCapacity(
  capacities: GroundTruthCapacity[],
  taskId?: string,
  actionId?: string
): GroundTruthCapacity | null {
  if (!capacities || capacities.length === 0) return null;

  // 1. Match by architectural prefix + actionId (e.g. taskId "1_CONF", actionId "7" -> "CONF 7")
  if (taskId && actionId) {
    const taskCode = taskId.replace(/^\d+_/, "").trim().toLowerCase();
    const actionNum = actionId.trim();
    const targetKey = `${taskCode} ${actionNum}`;
    const targetKeyUnderscore = `${taskCode}_${actionNum}`;

    const match = capacities.find((c) => {
      const id = (c.capacityId || "").trim().toLowerCase();
      return id === targetKey || id === targetKeyUnderscore;
    });
    if (match) return match;
  }

  // 2. Direct exact match against capacityId (e.g. actionId is already "CONF 7")
  if (actionId) {
    const match = capacities.find((c) => (c.capacityId || "").trim().toLowerCase() === actionId.trim().toLowerCase());
    if (match) return match;
  }

  return null;
}

export async function evaluateAltusModule(gtCase: GroundTruthCase): Promise<AltusEvalResult> {
  const capacities = gtCase.altus?.capacities || [];
  const n = capacities.length;
  let outputJson: Record<string, any> = {};
  let totalFollowUps = 0;
  let redundantFollowUps = 0;
  let qualitySum = 0;
  let outputFileName = "";
  let sessionTranscriptHistory = "";
  const followUpsPerAction = new Map<string, number>();
  const localThreadHistoryPerAction = new Map<string, string>();

  if (fs.existsSync(EVAL_PATHS.questionsAltus)) {
    try {
      console.log(`  └─ [LangGraph 🕸️] Ejecutando grafo completo para preguntas-ALTUS.json...`);
      const { profile, tasks } = await loadSession(EVAL_PATHS.questionsAltus);

      setDynamicResponses(async (lookup, questionText) => {
        const actionKey = lookup.taskId ? `${lookup.taskId}_${lookup.actionId}` : (lookup.actionId || "unknown");
        const alreadyAnsweredInitial = localThreadHistoryPerAction.has(actionKey);
        const isInitialTurn = !alreadyAnsweredInitial && (!lookup.questionIndex || lookup.questionIndex === 0);
        const matchedCap = findGroundTruthCapacity(capacities, lookup.taskId, lookup.actionId);

        // Turno 1: Entregar la respuesta vaga inicial del Ground Truth
        if (isInitialTurn) {
          const initialVagueResponse =
            matchedCap?.initialVagueResponse ||
            "Estamos trabajando en formalizar este proceso y analizando qué soluciones tecnológicas adoptar.";

          const initialTurnLog = `Consultor (Pregunta inicial): ${questionText}\nEntrevistado (Respuesta inicial): ${initialVagueResponse}\n`;
          localThreadHistoryPerAction.set(actionKey, initialTurnLog);
          sessionTranscriptHistory += `\n[Capacidad: ${matchedCap?.capacityName || actionKey}]\n${initialTurnLog}`;
          return initialVagueResponse;
        }

        // Turnos 2, 3...: El agente genera una repregunta de seguimiento
        totalFollowUps++;
        followUpsPerAction.set(actionKey, (followUpsPerAction.get(actionKey) || 0) + 1);

        const simOutput = await simulateStakeholder({
          companyName: gtCase.companyName,
          companyFullContext: gtCase.companyFullContext,
          sessionTranscriptHistory,
          agentFollowupQuestion: questionText,
        });

        if (simOutput.isRedundant) redundantFollowUps++;

        const capContext = matchedCap?.fullContext || gtCase.companyFullContext;
        const localThread = localThreadHistoryPerAction.get(actionKey) || `Consultor: ${matchedCap?.question || questionText}\n`;

        const qualityOutput = await evaluateAltusFollowUpQualityWithJudge({
          capacityName: matchedCap?.capacityName || actionKey,
          originalQuestion: matchedCap?.question || questionText,
          capacityContext: capContext,
          localThreadHistory: localThread,
          agentFollowUpQuestion: questionText,
        });
        qualitySum += qualityOutput.score;

        const followUpTurnLog = `Consultor (Repregunta): ${questionText}\nEntrevistado: ${simOutput.response}\n`;
        localThreadHistoryPerAction.set(actionKey, localThread + followUpTurnLog);
        sessionTranscriptHistory += followUpTurnLog;
        return simOutput.response;
      });

      const graph = createGraph(profile);
      const baseInitialState = createInitialState(profile, "eval_altus");
      outputFileName = baseInitialState.outputFileName;

      const finalState = await graph.invoke(
        { ...baseInitialState, taskQueue: tasks },
        { recursionLimit: EVAL_CONFIG.recursionLimits.altus }
      );
      if (finalState.outputFileName) outputFileName = finalState.outputFileName;
      outputJson = finalState.outputJson || {};
      console.log(`  └─ [LangGraph 🕸️] Grafo completado. Entradas en outputJson: ${Object.keys(outputJson).length}`);
    } catch (e: any) {
      console.warn("⚠️ [LangGraph ALTUS] Notificación durante la ejecución del grafo:", e?.message || e);
    } finally {
      setDynamicResponses(null);
    }
  }

  const scores = scoreAltusOutput(outputJson, capacities);

  // Calcular paradas prematuras (capacidades donde el agente no repreguntó ante la respuesta vaga inicial)
  let prematureStopCount = 0;
  for (let i = 0; i < n; i++) {
    const cap = capacities[i];
    const capId = cap.capacityId || (cap as any).key || `${i + 1}`;
    const followUps = followUpsPerAction.get(capId) || followUpsPerAction.get(`${i + 1}`) || 0;
    if (followUps === 0) {
      prematureStopCount++;
    }
  }

  // Turnos medios = (turnos iniciales + repreguntas) / total de capacidades
  const averageTurnCount = n > 0 ? Number(((n + totalFollowUps) / n).toFixed(2)) : 1.0;

  const variablesFileName = outputFileName.startsWith("output_")
    ? outputFileName.replace("output_", "variables_")
    : `variables_${outputFileName}`;

  return {
    caseId: gtCase.caseId,
    accuracy: scores.accuracy,
    mae: scores.mae,
    redundancyRate: totalFollowUps > 0 ? Number((redundantFollowUps / totalFollowUps).toFixed(3)) : 0,
    agenticHitRate: totalFollowUps > 0 ? Number(((totalFollowUps - redundantFollowUps) / totalFollowUps).toFixed(3)) : 0,
    totalFollowUps,
    overAskingCount: redundantFollowUps,
    agenticHitCount: totalFollowUps - redundantFollowUps,
    prematureStopCount,
    averageFollowUpQuality: totalFollowUps > 0 ? Number((qualitySum / totalFollowUps).toFixed(2)) : 0,
    averageTurnCount,
    conversationFile: outputFileName,
    variablesFile: variablesFileName,
  };
}

// ==========================================
// 4. Módulo SIPAC
// ==========================================

export async function scoreSipacOutput(
  outputJson: Record<string, any>,
  gtCase: GroundTruthCase,
  tauStar = EVAL_CONFIG.tauStar
): Promise<{
  giaMetrics: SoftFieldMetrics;
  activoIntangibleMetrics: SoftFieldMetrics;
  intellectusCiMetrics: SoftFieldMetrics;
  artefactosMetrics: SoftFieldMetrics;
  indicadoresMetrics: SoftFieldMetrics;
  overallF1: number;
}> {
  const sipac = gtCase.sipac;
  if (!sipac) throw new Error(`El caso ${gtCase.caseId} no contiene información de Ground Truth para SIPAC.`);

  const extracted = extractSipacEntities(outputJson);

  const gtGIA = sipac.activosGIA.map((g) => g.giaNombre || "");
  const giaMetrics = await evaluateFieldMatching(extracted.gia, gtGIA, "GIA", gtCase.companyName, tauStar);

  const gtActivosIntangibles = sipac.activosGIA.map((g) => g.activoIntangibleNombre || "");
  const activoIntangibleMetrics = await evaluateFieldMatching(
    extracted.activosIntangibles,
    gtActivosIntangibles,
    "ACTIVO_INTANGIBLE",
    gtCase.companyName,
    tauStar
  );

  const gtIntellectus = sipac.activosGIA.map((g) => g.intellectusCi || "");
  const intellectusCiMetrics = await evaluateFieldMatching(
    extracted.intellectusCi,
    gtIntellectus,
    "INTELLECTUS_CI",
    gtCase.companyName,
    tauStar
  );

  const gtArtefactos = sipac.artefactos.map((a) => a.artefactoNombre || "");
  const artefactosMetrics = await evaluateFieldMatching(
    extracted.artefactos,
    gtArtefactos,
    "ARTEFACTO",
    gtCase.companyName,
    tauStar
  );

  const gtIndicadores = sipac.indicadores.map((i) => i.indicadorNombre || "");
  const indicadoresMetrics = await evaluateFieldMatching(
    extracted.indicadores,
    gtIndicadores,
    "INDICADOR",
    gtCase.companyName,
    tauStar
  );

  const overallF1 = Number(
    (
      (giaMetrics.f1 +
        activoIntangibleMetrics.f1 +
        intellectusCiMetrics.f1 +
        artefactosMetrics.f1 +
        indicadoresMetrics.f1) /
      5
    ).toFixed(3)
  );

  return {
    giaMetrics,
    activoIntangibleMetrics,
    intellectusCiMetrics,
    artefactosMetrics,
    indicadoresMetrics,
    overallF1,
  };
}

export async function evaluateSipacModule(
  gtCase: GroundTruthCase,
  tauStar = EVAL_CONFIG.tauStar
): Promise<SipacEvalResult> {
  let outputFileName = "";
  let finalOutputJson: Record<string, any> = {};

  if (fs.existsSync(EVAL_PATHS.questionsSipac)) {
    try {
      console.log(`     ├─ 🕸️ [GRAPH] Ejecutando preguntas-SIPAC.json con datos del Caso Ground Truth...`);
      const { profile, tasks } = await loadSession(EVAL_PATHS.questionsSipac);

      setDynamicResponses(async (lookup) => getSipacGroundTruthResponse(lookup.actionId, gtCase));

      const graph = createGraph(profile);
      const initialState = { ...createInitialState(profile, "eval_sipac"), taskQueue: tasks };
      outputFileName = initialState.outputFileName;

      const finalState = await graph.invoke(initialState, { recursionLimit: EVAL_CONFIG.recursionLimits.sipac });
      if (finalState.outputFileName) outputFileName = finalState.outputFileName;
      finalOutputJson = finalState.outputJson || {};
      console.log(`     ├─ 🕸️ [GRAPH] Grafo SIPAC completado con éxito.`);
    } catch (e: any) {
      console.warn("     ⚠️ [GRAPH] Error durante la ejecución del grafo SIPAC:", e?.message || e);
    } finally {
      setDynamicResponses(null);
    }
  }

  console.log(`     ├─ 🧩 [MODULE::SIPAC] Evaluando coincidencias semánticas para ${gtCase.companyName}...`);
  const scores = await scoreSipacOutput(finalOutputJson, gtCase, tauStar);
  console.log(`     └─ 🧩 [MODULE::SIPAC] Completado para ${gtCase.companyName} | Overall F1: ${scores.overallF1.toFixed(3)}`);

  const variablesFileName = outputFileName.startsWith("output_")
    ? outputFileName.replace("output_", "variables_")
    : `variables_${outputFileName}`;

  return {
    caseId: gtCase.caseId,
    ...scores,
    conversationFile: outputFileName,
    variablesFile: variablesFileName,
  };
}

// ==========================================
// 5. Módulo AHP
// ==========================================

export async function evaluateAhpCriteriaWithJudge(params: {
  companyContext: string;
  artefactsContext: string;
  proposedCriteriaList: string;
  pairwiseComparisonsList: string;
}): Promise<AhpCriteriaEvaluationOutput & { totalScore: number; normalizedScore: number }> {
  const prompt = buildAhpCriteriaPrompt(params);

  try {
    const validated = await invokeStructuredJudge({
      schema: AhpCriteriaEvaluationSchema,
      prompt,
      description: "Juez AHP",
      systemMessage: "You are an expert AHP and MCDM evaluator. Output only valid JSON strictly matching the schema.",
      preprocessor: (parsed) => {
        for (const k of ["relevance", "nonOverlap", "completeness", "justification"] as const) {
          if (parsed[k] && typeof parsed[k] === "number") {
            parsed[k] = { score: parsed[k], reasoning: "Evaluación procesada." };
          }
        }
        return parsed;
      },
    });

    const relScore = validated.relevance?.score ?? 1;
    const nonScore = validated.nonOverlap?.score ?? 1;
    const comScore = validated.completeness?.score ?? 1;
    const justScore = validated.justification?.score ?? 1;
    const totalScore = relScore + nonScore + comScore + justScore;
    const normalizedScore = Number((totalScore / 12).toFixed(3));

    return {
      relevance: { score: relScore, reasoning: validated.relevance?.reasoning || "Evaluado." },
      nonOverlap: { score: nonScore, reasoning: validated.nonOverlap?.reasoning || "Evaluado." },
      completeness: { score: comScore, reasoning: validated.completeness?.reasoning || "Evaluado." },
      justification: { score: justScore, reasoning: validated.justification?.reasoning || "Evaluado." },
      totalScore,
      normalizedScore,
    };
  } catch (e: any) {
    console.warn("⚠️ [Judge AHP] Se aplicó fallback:", e?.message || e);
    return {
      relevance: { score: 1, reasoning: "Fallback por error de parseo" },
      nonOverlap: { score: 1, reasoning: "Fallback por error de parseo" },
      completeness: { score: 1, reasoning: "Fallback por error de parseo" },
      justification: { score: 1, reasoning: "Fallback por error de parseo" },
      totalScore: 4,
      normalizedScore: 0.333,
    };
  }
}

export async function scoreAhpOutput(
  outputJson: Record<string, any>,
  gtCase: GroundTruthCase
): Promise<{
  relevanceScore: number;
  nonOverlapScore: number;
  completenessScore: number;
  justificationScore: number;
  totalScore: number;
  normalizedScore: number;
  reasoning: string;
}> {
  const companyContext =
    gtCase.companyFullContext ||
    `Empresa: ${gtCase.companyName}.\nSector y Actividad: ${gtCase.description || "PYME de servicios"}.\nObjetivos: Mejora operativa y transformación digital.`;

  const artefactsContext = gtCase.sipac?.artefactos
    ? `Artefactos propuestos para ${gtCase.companyName}:\n` +
      gtCase.sipac.artefactos.map((a) => `- ${a.artefactoNombre} (Proceso: ${a.procesoId || "General"})`).join("\n")
    : `Artefactos de la empresa ${gtCase.companyName}`;

  let proposedCriteriaList = "";
  if (outputJson.ahp_suggested_criteria) {
    const crit = outputJson.ahp_suggested_criteria;
    proposedCriteriaList = typeof crit === "string" ? crit : JSON.stringify(crit, null, 2);
  } else if (outputJson.ahp_final_criteria) {
    const crit = outputJson.ahp_final_criteria;
    proposedCriteriaList = typeof crit === "string" ? crit : JSON.stringify(crit, null, 2);
  } else {
    proposedCriteriaList = `Criterios de priorización propuestos para ${gtCase.companyName}`;
  }

  let pairwiseComparisonsList = "";
  if (outputJson.ahp_criteria_comparisons) {
    const comp = outputJson.ahp_criteria_comparisons;
    pairwiseComparisonsList = typeof comp === "string" ? comp : JSON.stringify(comp, null, 2);
  } else {
    pairwiseComparisonsList = "No se registraron comparaciones pareadas de criterios explícitas.";
  }

  const judgeResult = await evaluateAhpCriteriaWithJudge({
    companyContext,
    artefactsContext,
    proposedCriteriaList,
    pairwiseComparisonsList,
  });

  return {
    relevanceScore: judgeResult.relevance.score,
    nonOverlapScore: judgeResult.nonOverlap.score,
    completenessScore: judgeResult.completeness.score,
    justificationScore: judgeResult.justification.score,
    totalScore: judgeResult.totalScore,
    normalizedScore: judgeResult.normalizedScore,
    reasoning: judgeResult.relevance.reasoning,
  };
}

export async function evaluateAhpModule(gtCase: GroundTruthCase): Promise<AhpEvalResult> {
  let outputFileName = "";
  let finalOutputJson: Record<string, any> = {};

  if (fs.existsSync(EVAL_PATHS.questionsAhp)) {
    try {
      console.log(`  └─ [LangGraph 🕸️] Ejecutando grafo completo para preguntas-AHP.json...`);
      const { profile, tasks } = await loadSession(EVAL_PATHS.questionsAhp);

      setDynamicResponses(async (lookup) => getAhpGroundTruthResponse(lookup.actionId, gtCase));

      const graph = createGraph(profile);
      const sipacContext = gtCase.sipac
        ? JSON.stringify(gtCase.sipac, null, 2)
        : `Empresa: ${gtCase.companyName}. ${gtCase.description || ""}`;

      const initialState = {
        ...createInitialState(profile, "eval_ahp"),
        taskQueue: tasks,
        outputJson: {
          sipac_final_output: sipacContext,
          previous_processes_summary: `Empresa: ${gtCase.companyName}. ${gtCase.description || ""}`,
        },
      };

      outputFileName = initialState.outputFileName;
      const finalState = await graph.invoke(initialState, { recursionLimit: EVAL_CONFIG.recursionLimits.ahp });
      if (finalState.outputFileName) outputFileName = finalState.outputFileName;
      finalOutputJson = finalState.outputJson || {};
      console.log(`  └─ [LangGraph 🕸️] Grafo AHP completado con éxito.`);
    } catch (e: any) {
      console.warn("⚠️ [LangGraph AHP] Notificación durante la ejecución del grafo:", e?.message || e);
    } finally {
      setDynamicResponses(null);
    }
  }

  const scores = await scoreAhpOutput(finalOutputJson, gtCase);
  const variablesFileName = outputFileName.startsWith("output_")
    ? outputFileName.replace("output_", "variables_")
    : `variables_${outputFileName}`;

  return {
    caseId: gtCase.caseId,
    ...scores,
    conversationFile: outputFileName,
    variablesFile: variablesFileName,
  };
}
