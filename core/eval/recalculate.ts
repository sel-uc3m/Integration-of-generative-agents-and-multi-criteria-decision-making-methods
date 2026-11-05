import fs from "node:fs";
import path from "node:path";
import { loadEvalCache, saveEvalCache, findHistoricalVariablesFile } from "./runner.js";
import {
  loadGroundTruthCase,
  findGroundTruthCapacity,
  scoreAltusOutput,
  evaluateAltusFollowUpQualityWithJudge,
  scoreSipacOutput,
  scoreAhpOutput,
} from "./evaluators.js";
import { generateEvaluationReport, printEvaluationSummary } from "./reporter.js";
import { EVAL_CONFIG, EVAL_PATHS } from "./config.js";

function parseRecalculateArgs(): {
  targetModule: "all" | "altus" | "sipac" | "ahp";
  targetCases: string[];
} {
  const args = process.argv.slice(2);
  let targetModule: "all" | "altus" | "sipac" | "ahp" = "all";
  let targetCases: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--module=")) {
      const mod = arg.split("=")[1].toLowerCase();
      if (mod === "altus" || mod === "sipac" || mod === "ahp" || mod === "all") {
        targetModule = mod;
      }
    } else if (arg.startsWith("--cases=")) {
      targetCases = arg.split("=")[1].split(",").map((c) => c.trim());
    } else if (arg.startsWith("--case=")) {
      targetCases = [arg.split("=")[1].trim()];
    }
  }

  return { targetModule, targetCases };
}

function loadDirectFile(fileName?: string): { fileName: string; fullPath: string; content: any } | null {
  if (!fileName) return null;
  const fullPath = path.join(EVAL_PATHS.resultsDir, fileName);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    return { fileName, fullPath, content: JSON.parse(raw) };
  } catch {
    return null;
  }
}

async function recalculateAltus(entry: any, gtCase: any, cacheKey: string): Promise<void> {
  if (!gtCase.altus?.capacities) return;
  const capacities = gtCase.altus.capacities;
  const n = capacities.length;

  console.log(`\n  📈 [ALTUS] Recalculando para ${cacheKey}...`);

  // 1. Accuracy y MAE directo del fichero de variables de esta evaluación
  const varFile = loadDirectFile(entry.altus?.variablesFile);
  let scores = { accuracy: 0, mae: 0 };
  if (varFile) {
    scores = scoreAltusOutput(varFile.content, capacities);
    console.log(`     ├─ Resultado: Accuracy: ${(scores.accuracy * 100).toFixed(1)}% | MAE: ${scores.mae} (de ${varFile.fileName})`);
  } else {
    console.warn(`     ⚠️ No se encontró variablesFile: ${entry.altus?.variablesFile}`);
  }

  const redundancyPhrases = [
    "ya lo hemos comentado",
    "ya lo habíamos hablado",
    "ya te comenté",
    "ya te he comentado",
    "ya te dije",
    "como te comenté",
    "como te decía",
    "ya lo mencioné",
    "ya lo comentamos",
    "ya lo hablamos",
    "como ya te dije",
    "como ya he comentado",
    "como ya comenté",
  ];

  // 2. Proceso conversacional directo de la transcripción de esta evaluación
  const convFile = loadDirectFile(entry.altus?.conversationFile);
  let totalFollowUps = 0;
  let redundantFollowUps = 0;
  let qualitySum = 0;
  const followUpsPerAction = new Map<string, number>();

  if (convFile) {
    const records: Record<string, any> = convFile.content;

    for (const [recKey, rec] of Object.entries(records)) {
      const taskId = rec.task_id || rec.taskId;
      const actionId = rec.action_id || rec.actionId;
      const actionKey = actionId || recKey;
      const matchedCap = findGroundTruthCapacity(capacities, taskId, actionId);
      const capName = matchedCap?.capacityName || recKey;
      const originalQuestion = matchedCap?.question || rec.question || "";
      const capContext = matchedCap?.fullContext || gtCase.companyFullContext;

      const partial: Array<{ role: string; type: string; content: string }> = rec.partial || [];
      if (!Array.isArray(partial) || partial.length <= 2) {
        continue;
      }

      let localThread = "";

      for (let i = 0; i < partial.length; i++) {
        const item = partial[i];
        if (item.role === "assistant") {
          if (i === 0) {
            localThread += `Consultor (Pregunta inicial): ${item.content}\n`;
          } else {
            totalFollowUps++;
            followUpsPerAction.set(actionKey, (followUpsPerAction.get(actionKey) || 0) + 1);
            const questionText = item.content;

            // Detectar si el simulador marcó redundancia en su respuesta
            const nextUserItem = partial[i + 1];
            const userResp = (nextUserItem?.content || "").toLowerCase();
            if (redundancyPhrases.some((phrase) => userResp.includes(phrase))) {
              redundantFollowUps++;
            }

            const qualityOutput = await evaluateAltusFollowUpQualityWithJudge({
              capacityName: capName,
              originalQuestion,
              capacityContext: capContext,
              localThreadHistory: localThread,
              agentFollowUpQuestion: questionText,
            });

            qualitySum += qualityOutput.score;
            localThread += `Consultor (Repregunta): ${questionText}\n`;
          }
        } else if (item.role === "user") {
          const label = i === 1 ? "Entrevistado (Respuesta inicial)" : "Entrevistado";
          localThread += `${label}: ${item.content}\n`;
        }
      }
    }
  }

  let prematureStopCount = 0;
  for (let i = 0; i < n; i++) {
    const cap = capacities[i];
    const capId = cap.capacityId || (cap as any).key || `${i + 1}`;
    const followUps = followUpsPerAction.get(capId) || followUpsPerAction.get(`${i + 1}`) || 0;
    if (followUps === 0) {
      prematureStopCount++;
    }
  }

  const averageTurnCount = n > 0 ? Number(((n + totalFollowUps) / n).toFixed(2)) : 1.0;
  const avgQuality = totalFollowUps > 0 ? Number((qualitySum / totalFollowUps).toFixed(2)) : 0;
  const redundancyRate = totalFollowUps > 0 ? Number((redundantFollowUps / totalFollowUps).toFixed(3)) : 0;
  const agenticHitCount = totalFollowUps - redundantFollowUps;
  const agenticHitRate = totalFollowUps > 0 ? Number((agenticHitCount / totalFollowUps).toFixed(3)) : 0;

  if (entry.altus) {
    if (varFile) {
      entry.altus.accuracy = scores.accuracy;
      entry.altus.mae = scores.mae;
    }
    entry.altus.totalFollowUps = totalFollowUps;
    entry.altus.overAskingCount = redundantFollowUps;
    entry.altus.redundancyRate = redundancyRate;
    entry.altus.agenticHitCount = agenticHitCount;
    entry.altus.agenticHitRate = agenticHitRate;
    entry.altus.prematureStopCount = prematureStopCount;
    entry.altus.averageTurnCount = averageTurnCount;
    entry.altus.averageFollowUpQuality = avgQuality;
  }

  console.log(`     └─ Proceso: Calidad Follow-ups: ${avgQuality}/3.0 | Turnos: ${averageTurnCount} | Redundancia: ${(redundancyRate * 100).toFixed(1)}% (${redundantFollowUps}/${totalFollowUps})`);
}

async function recalculateSipac(entry: any, gtCase: any, cacheKey: string): Promise<void> {
  if (!gtCase.sipac) return;

  const varFile = loadDirectFile(entry.sipac?.variablesFile);
  if (!varFile) {
    console.warn(`  ⚠️ [SIPAC] No se encontró variablesFile (${entry.sipac?.variablesFile}) para ${cacheKey}`);
    return;
  }

  console.log(`\n  🧩 [SIPAC] Recalculando para ${cacheKey} usando ${varFile.fileName}...`);
  const scores = await scoreSipacOutput(varFile.content, gtCase, EVAL_CONFIG.tauStar);
  console.log(
    `     └─ Overall F1: ${(scores.overallF1 * 100).toFixed(1)}% (GIA: ${(scores.giaMetrics.f1 * 100).toFixed(1)}% | AI: ${(scores.activoIntangibleMetrics.f1 * 100).toFixed(1)}% | CI: ${(scores.intellectusCiMetrics.f1 * 100).toFixed(1)}% | Artefactos: ${(scores.artefactosMetrics.f1 * 100).toFixed(1)}% | KPIs: ${(scores.indicadoresMetrics.f1 * 100).toFixed(1)}%)`
  );

  if (entry.sipac) {
    entry.sipac.giaMetrics = scores.giaMetrics;
    entry.sipac.activoIntangibleMetrics = scores.activoIntangibleMetrics;
    entry.sipac.intellectusCiMetrics = scores.intellectusCiMetrics;
    entry.sipac.artefactosMetrics = scores.artefactosMetrics;
    entry.sipac.indicadoresMetrics = scores.indicadoresMetrics;
    entry.sipac.overallF1 = scores.overallF1;
  }
}

async function recalculateAhp(entry: any, gtCase: any, cacheKey: string): Promise<void> {
  const varFile = loadDirectFile(entry.ahp?.variablesFile);
  if (!varFile) {
    console.warn(`  ⚠️ [AHP] No se encontró variablesFile (${entry.ahp?.variablesFile}) para ${cacheKey}`);
    return;
  }

  console.log(`\n  ⚖️ [AHP] Recalculando soporte a la decisión para ${cacheKey} usando ${varFile.fileName}...`);
  const scores = await scoreAhpOutput(varFile.content, gtCase);
  console.log(
    `     └─ Calidad Asistencia AHP: ${(scores.normalizedScore * 100).toFixed(1)}% (${scores.totalScore}/12) | Relevancia: ${scores.relevanceScore}/3 | Ortogonalidad: ${scores.nonOverlapScore}/3 | Completitud: ${scores.completenessScore}/3 | Justificación: ${scores.justificationScore}/3`
  );

  if (entry.ahp) {
    entry.ahp.relevanceScore = scores.relevanceScore;
    entry.ahp.nonOverlapScore = scores.nonOverlapScore;
    entry.ahp.completenessScore = scores.completenessScore;
    entry.ahp.justificationScore = scores.justificationScore;
    entry.ahp.totalScore = scores.totalScore;
    entry.ahp.normalizedScore = scores.normalizedScore;
    entry.ahp.reasoning = scores.reasoning;
  }
}

async function main() {
  const cli = parseRecalculateArgs();
  const cache = loadEvalCache();
  const allKeys = Object.keys(cache);

  if (allKeys.length === 0) {
    console.warn("⚠️ No se encontraron entradas en el cache de evaluación.");
    return;
  }

  const targetKeys = allKeys.filter((key) => {
    if (cli.targetCases.length === 0) return true;
    const entry = cache[key];
    return cli.targetCases.includes(entry.caseId);
  });

  console.log(`=================================================`);
  console.log(`🎯 RECÁLCULO DE EVALUACIÓN OFFLINE`);
  console.log(`Módulo: ${cli.targetModule.toUpperCase()} | Casos seleccionados: ${targetKeys.length}/${allKeys.length}`);
  console.log(`=================================================`);

  for (const key of targetKeys) {
    const entry = cache[key];
    let gtCase;
    try {
      gtCase = loadGroundTruthCase(entry.caseId);
    } catch {
      console.warn(`⚠️ No se pudo cargar Ground Truth para caso ${entry.caseId}`);
      continue;
    }

    console.log(`\n🏢 Evaluando caso en caché: ${key} (${entry.companyName || entry.caseId})`);

    if (cli.targetModule === "all" || cli.targetModule === "altus") {
      if (entry.altus) await recalculateAltus(entry, gtCase, key);
    }
    if (cli.targetModule === "all" || cli.targetModule === "sipac") {
      if (entry.sipac) await recalculateSipac(entry, gtCase, key);
    }
    if (cli.targetModule === "all" || cli.targetModule === "ahp") {
      if (entry.ahp) await recalculateAhp(entry, gtCase, key);
    }
  }

  saveEvalCache(cache);
  generateEvaluationReport(Object.values(cache));
  console.log("\n=================================================");
  console.log("✅ Recálculo completado y reporte consolidado actualizado.");
  console.log("=================================================");
  printEvaluationSummary(Object.values(cache));
}

main().catch(console.error);
