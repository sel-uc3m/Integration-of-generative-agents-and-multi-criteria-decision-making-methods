import fs from "node:fs";
import path from "node:path";
import { SipacFieldType } from "./prompts.js";
import { calculateBatchCosineSimilarity, evaluateSipacCandidatePairsBatch } from "./scoring.js";
import { extractSipacEntities, loadGroundTruthCase, getSipacGroundTruthResponse } from "./evaluators.js";
import { createGraph, createInitialState, loadSession } from "../src/index.js";
import { setDynamicResponses } from "../src/scripted.js";
import { EVAL_CONFIG, EVAL_PATHS } from "./config.js";

interface SweepStep {
  tau: number;
  discardedPercent: number;
  falseNegatives: number;
  savingsPercent: number;
  byCategory: Record<string, { total: number; filtered: number; fn: number }>;
}

interface PairData {
  id: number;
  agentItem: string;
  gtItem: string;
  category: SipacFieldType;
  cosine: number;
  judgeScore: number;
  reasoning: string;
}

/**
 * Calibrates tau* threshold empirically on pilot case G1_empresa_a.json
 * across all 5 entity categories and scores real-vs-GT pairs with the LLM Judge.
 */
export async function calibrateThreshold(): Promise<number> {
  console.log("=================================================================");
  console.log("CALIBRACIÓN DEL UMBRAL TAU* (SIPAC)");
  console.log("=================================================================");

  const pilotCase = loadGroundTruthCase("G1_empresa_a");
  if (!pilotCase.sipac) {
    console.error("El caso piloto no contiene sección SIPAC.");
    process.exit(1);
  }

  console.log(`\nCargado caso piloto: ${pilotCase.companyName} (${pilotCase.caseId})`);

  // 1. Ejecutar grafo LangGraph de SIPAC
  let finalOutputJson: Record<string, any> = {};
  if (!fs.existsSync(EVAL_PATHS.questionsSipac)) {
    console.error("No se encontró preguntas-SIPAC.json en:", EVAL_PATHS.questionsSipac);
    process.exit(1);
  }

  console.log("\n[1/4] Ejecutando grafo SIPAC con agente LLM...");
  const { profile, tasks } = await loadSession(EVAL_PATHS.questionsSipac);

  setDynamicResponses(async (lookup) => getSipacGroundTruthResponse(lookup.actionId, pilotCase));

  const graph = createGraph(profile);
  const initialState = {
    ...createInitialState(profile, "eval_calibrate_sipac"),
    taskQueue: tasks,
  };

  const finalState = await graph.invoke(initialState, { recursionLimit: EVAL_CONFIG.recursionLimits.sipac });
  finalOutputJson = finalState.outputJson || {};
  setDynamicResponses(null);
  console.log("Grafo SIPAC ejecutado con éxito.");

  // 2. Extraer entidades
  console.log("\n[2/4] Extrayendo entidades generadas en las 5 categorías...");
  const extracted = extractSipacEntities(finalOutputJson);

  const categories: Array<{
    category: SipacFieldType;
    agentItems: string[];
    gtItems: string[];
  }> = [
    { category: "GIA", agentItems: extracted.gia, gtItems: pilotCase.sipac.activosGIA.map((g) => g.giaNombre || "") },
    {
      category: "ACTIVO_INTANGIBLE",
      agentItems: extracted.activosIntangibles,
      gtItems: pilotCase.sipac.activosGIA.map((g) => g.activoIntangibleNombre || ""),
    },
    {
      category: "INTELLECTUS_CI",
      agentItems: extracted.intellectusCi,
      gtItems: pilotCase.sipac.activosGIA.map((g) => g.intellectusCi || ""),
    },
    {
      category: "ARTEFACTO",
      agentItems: extracted.artefactos,
      gtItems: pilotCase.sipac.artefactos.map((a) => a.artefactoNombre || ""),
    },
    {
      category: "INDICADOR",
      agentItems: extracted.indicadores,
      gtItems: pilotCase.sipac.indicadores.map((i) => i.indicadorNombre || ""),
    },
  ];

  // 3. Matriz de pares y evaluación con Juez LLM
  console.log("\n[3/4] Generando matrices de embeddings y evaluando pares...");
  const allPairResults: PairData[] = [];
  let globalPairId = 1;

  for (const cat of categories) {
    const { category, agentItems, gtItems } = cat;
    if (agentItems.length === 0 || gtItems.length === 0) continue;

    const cosineMatrix = await calculateBatchCosineSimilarity(agentItems, gtItems);
    const candidatePairs: Array<{ id: number; agentItem: string; groundTruthItem: string; i: number; j: number }> = [];

    for (let i = 0; i < agentItems.length; i++) {
      for (let j = 0; j < gtItems.length; j++) {
        candidatePairs.push({
          id: globalPairId++,
          agentItem: agentItems[i],
          groundTruthItem: gtItems[j],
          i,
          j,
        });
      }
    }

    const evaluatedMap = await evaluateSipacCandidatePairsBatch(
      candidatePairs.map((p) => ({ id: p.id, agentItem: p.agentItem, groundTruthItem: p.groundTruthItem })),
      category,
      `Contexto de la empresa: ${pilotCase.companyName}. ${pilotCase.description || ""}`
    );

    for (const p of candidatePairs) {
      const evalData = evaluatedMap.get(p.id);
      allPairResults.push({
        id: p.id,
        agentItem: p.agentItem,
        gtItem: p.groundTruthItem,
        category,
        cosine: cosineMatrix[p.i]?.[p.j] ?? 0.0,
        judgeScore: evalData?.score ?? 0,
        reasoning: evalData?.reasoning ?? "",
      });
    }
  }

  const totalCalls = allPairResults.length;
  console.log(`\nTotal de pares evaluados: ${totalCalls}`);

  // 4. Barrido tau [0.15 a 0.50]
  console.log("\n[4/4] BARRIDO DE SENSIBILIDAD TAU (0.15 a 0.50):");
  console.log("Tau\tDescartados (%)\tFalsos Negativos (score >= 1)\tAhorro LLM (%)");

  let optimalTau = 0.15;
  const sweepResults: SweepStep[] = [];

  for (let tau = 0.15; tau <= 0.5; tau += 0.05) {
    const roundedTau = Number(tau.toFixed(2));
    let falseNegatives = 0;
    let filteredCount = 0;

    const byCategory: Record<string, { total: number; filtered: number; fn: number }> = {
      GIA: { total: 0, filtered: 0, fn: 0 },
      ACTIVO_INTANGIBLE: { total: 0, filtered: 0, fn: 0 },
      INTELLECTUS_CI: { total: 0, filtered: 0, fn: 0 },
      ARTEFACTO: { total: 0, filtered: 0, fn: 0 },
      INDICADOR: { total: 0, filtered: 0, fn: 0 },
    };

    for (const pair of allPairResults) {
      const catStats = byCategory[pair.category];
      if (catStats) catStats.total++;

      if (pair.cosine < roundedTau) {
        filteredCount++;
        if (catStats) catStats.filtered++;
        if (pair.judgeScore >= 1) {
          falseNegatives++;
          if (catStats) catStats.fn++;
        }
      }
    }

    const savingsPercent = Number(((filteredCount / totalCalls) * 100).toFixed(1));
    console.log(`${roundedTau.toFixed(2)}\t${savingsPercent}%\t\t${falseNegatives}\t\t\t\t${savingsPercent}%`);

    sweepResults.push({ tau: roundedTau, discardedPercent: savingsPercent, falseNegatives, savingsPercent, byCategory });
    if (falseNegatives === 0) optimalTau = roundedTau;
  }

  console.log(`\nUMBRAL ÓPTIMO CALIBRADO (FN = 0): tau* = ${optimalTau}`);

  // Guardar log
  const calibDir = path.join(EVAL_PATHS.resultsDir, "calibrations");
  if (!fs.existsSync(calibDir)) fs.mkdirSync(calibDir, { recursive: true });

  const logData = {
    timestamp: new Date().toISOString(),
    pilotCaseId: pilotCase.caseId,
    pilotCompanyName: pilotCase.companyName,
    totalPairsEvaluated: totalCalls,
    optimalTau,
    sweepResults,
    pairsSample: allPairResults.slice(0, 30),
  };

  const jsonLogPath = path.join(calibDir, `calibration_log_${Date.now()}.json`);
  fs.writeFileSync(jsonLogPath, JSON.stringify(logData, null, 2), "utf-8");
  console.log(`\nLog JSON guardado en: ${jsonLogPath}`);

  return optimalTau;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  calibrateThreshold().catch(console.error);
}
