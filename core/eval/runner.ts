import fs from "node:fs";
import path from "node:path";
import { CaseEvalResult, GroundTruthCase } from "./types.js";
import { EVAL_CONFIG, EVAL_PATHS } from "./config.js";
import { loadAllGroundTruthCases, evaluateAltusModule, evaluateSipacModule, evaluateAhpModule } from "./evaluators.js";
import { generateEvaluationReport, printEvaluationSummary } from "./reporter.js";

// ==========================================
// 1. Parseo de Argumentos CLI
// ==========================================

export type EvalTargetModule = "all" | "altus" | "sipac" | "ahp";

export interface ParsedEvalArgs {
  models: string[];
  targetModule: EvalTargetModule;
  targetCases: string[];
  isGlobalFresh: boolean;
  freshModule: EvalTargetModule | null;
  shouldRunAltus: boolean;
  shouldRunSipac: boolean;
  shouldRunAhp: boolean;
  isFreshAltus: boolean;
  isFreshSipac: boolean;
  isFreshAhp: boolean;
}

export function parseEvalArgs(argv: string[] = process.argv.slice(2)): ParsedEvalArgs {
  let models: string[] = [];
  let targetModule: EvalTargetModule = "all";
  let targetCases: string[] = [];
  let isGlobalFresh = false;
  let freshModule: EvalTargetModule | null = null;

  for (const arg of argv) {
    if (arg.startsWith("--models=")) {
      models = arg.slice(9).split(",").map((m) => m.trim()).filter(Boolean);
    } else if (arg.startsWith("--model=")) {
      models = [arg.slice(8).trim()];
    } else if (arg.startsWith("--module=")) {
      const mod = arg.slice(9).trim().toLowerCase();
      if (["altus", "sipac", "ahp", "all"].includes(mod)) targetModule = mod as EvalTargetModule;
    } else if (arg.startsWith("--cases=") || arg.startsWith("--case=")) {
      const val = arg.includes("=") ? arg.split("=")[1] : "";
      targetCases = val.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
    } else if (arg.startsWith("--fresh=")) {
      const mod = arg.slice(8).trim().toLowerCase();
      if (["altus", "sipac", "ahp", "all"].includes(mod)) freshModule = mod as EvalTargetModule;
    } else if (arg === "--fresh" || arg === "--no-cache") {
      isGlobalFresh = true;
    }
  }

  if (models.length === 0) models = [EVAL_CONFIG.defaultSystemModel];

  return {
    models,
    targetModule,
    targetCases,
    isGlobalFresh,
    freshModule,
    shouldRunAltus: targetModule === "all" || targetModule === "altus",
    shouldRunSipac: targetModule === "all" || targetModule === "sipac",
    shouldRunAhp: targetModule === "all" || targetModule === "ahp",
    isFreshAltus: isGlobalFresh || freshModule === "all" || freshModule === "altus",
    isFreshSipac: isGlobalFresh || freshModule === "all" || freshModule === "sipac",
    isFreshAhp: isGlobalFresh || freshModule === "all" || freshModule === "ahp",
  };
}

// ==========================================
// 2. Gestión de Caché
// ==========================================

export function loadEvalCache(cacheFilePath = EVAL_PATHS.cacheFile): Record<string, CaseEvalResult> {
  if (fs.existsSync(cacheFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFilePath, "utf-8"));
    } catch {
      console.warn("⚠️ No se pudo leer el archivo de cache, iniciando cache vacío.");
    }
  }
  return {};
}

export function saveEvalCache(cache: Record<string, CaseEvalResult>, cacheFilePath = EVAL_PATHS.cacheFile): void {
  const cacheDir = path.dirname(cacheFilePath);
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), "utf-8");
}

export function saveCaseCheckpoint(cacheKey: string, result: CaseEvalResult, cache: Record<string, CaseEvalResult>): void {
  cache[cacheKey] = result;
  saveEvalCache(cache);
}

export function findHistoricalVariablesFile(
  caseId: string,
  moduleType: "altus" | "sipac" | "ahp",
  hintFileName?: string
): { fileName: string; fullPath: string; content: Record<string, any> } | null {
  if (!fs.existsSync(EVAL_PATHS.resultsDir)) return null;

  const isMatchingCase = (rawText: string, cId: string, mod: string): boolean => {
    const lower = rawText.toLowerCase();
    if (cId === "G1_empresa_a") return lower.includes("empresa_a") || lower.includes("gourmet") || lower.includes("cestas");
    if (cId === "G2_empresa_b") return lower.includes("empresa_b") || lower.includes("plantas") || lower.includes("cosmética") || lower.includes("cosmetica");
    if (cId === "G3_empresa_c") return lower.includes("hilos") || lower.includes("bordado") || lower.includes("wilcom") || lower.includes("patrones");
    if (cId === "G4_empresa_d") return lower.includes("empresa_d") || lower.includes("reformas") || lower.includes("obra");
    return true;
  };

  if (hintFileName) {
    const directPath = path.join(EVAL_PATHS.resultsDir, hintFileName);
    if (fs.existsSync(directPath)) {
      try {
        const raw = fs.readFileSync(directPath, "utf-8");
        if (isMatchingCase(raw, caseId, moduleType)) {
          return { fileName: hintFileName, fullPath: directPath, content: JSON.parse(raw) };
        }
      } catch {
        // Fallback to scan
      }
    }
  }

  const prefix = `variables_eval_${moduleType}_`;
  const files = fs
    .readdirSync(EVAL_PATHS.resultsDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort()
    .reverse();

  for (const file of files) {
    const fullPath = path.join(EVAL_PATHS.resultsDir, file);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      if (moduleType === "sipac" && !raw.includes("activos_propuestos") && !raw.includes("gia_tipo") && !raw.includes("artefactos_propuestos")) continue;
      if (isMatchingCase(raw, caseId, moduleType)) {
        return { fileName: file, fullPath, content: JSON.parse(raw) };
      }
    } catch {
      // Ignore corrupted files
    }
  }
  return null;
}

// ==========================================
// 3. Orquestador de Evaluación
// ==========================================

export async function runEvaluationSuite(): Promise<void> {
  const cli = parseEvalArgs();

  console.log("=================================================");
  console.log("🚀 INICIANDO BENCHMARK DE EVALUACIÓN DE AGENTES");
  console.log(`Modelos a evaluar (${cli.models.length}):`, cli.models.join(", "));
  console.log(`Módulo objetivo: ${cli.targetModule.toUpperCase()} (ALTUS=${cli.shouldRunAltus}, SIPAC=${cli.shouldRunSipac}, AHP=${cli.shouldRunAhp})`);
  if (cli.isGlobalFresh) console.log("Modo Fresh Global: Cache desactivado.");
  console.log("=================================================");

  const gtCases = loadAllGroundTruthCases(cli.targetCases);
  if (gtCases.length === 0) {
    console.error("❌ No se encontraron casos de prueba para evaluar.");
    return;
  }

  const cache = cli.isGlobalFresh ? {} : loadEvalCache();
  const allCaseResults: CaseEvalResult[] = [];

  for (let mIdx = 0; mIdx < cli.models.length; mIdx++) {
    const currentModel = cli.models[mIdx];
    process.env.EVAL_MODEL = currentModel;

    console.log(`\n=================================================`);
    console.log(`🤖 [MODELO ${mIdx + 1}/${cli.models.length}] EVALUANDO SISTEMA: ${currentModel}`);
    console.log(`=================================================`);

    for (let fIdx = 0; fIdx < gtCases.length; fIdx++) {
      const gtCase = gtCases[fIdx];
      const cacheKey = `${currentModel}::${gtCase.caseId}`;
      const cachedCase = cache[cacheKey];

      const altusSatisfied = !cli.shouldRunAltus || !gtCase.altus || (!cli.isFreshAltus && cachedCase?.altus !== undefined);
      const sipacSatisfied = !cli.shouldRunSipac || !gtCase.sipac || (!cli.isFreshSipac && cachedCase?.sipac !== undefined);
      const ahpSatisfied = !cli.shouldRunAhp || (!cli.isFreshAhp && cachedCase?.ahp !== undefined);

      if (cachedCase && altusSatisfied && sipacSatisfied && ahpSatisfied) {
        console.log(`⚡ [Cache Hit Completo] (${mIdx + 1}/${cli.models.length} | Caso ${fIdx + 1}/${gtCases.length}) Reutilizando: ${currentModel} | ${gtCase.caseId}`);
        allCaseResults.push(cachedCase);
        continue;
      }

      console.log(`\n-------------------------------------------------`);
      console.log(`📌 CASO [${fIdx + 1}/${gtCases.length}]: ${gtCase.caseId} (${gtCase.companyName}) | MODELO: ${currentModel}`);
      console.log(`Tipo: ${gtCase.isPilot ? "🟡 Caso Piloto (Dev Set)" : "🟢 Test Ciego (Blind Set)"}`);
      console.log(`-------------------------------------------------`);

      const caseStartTime = performance.now();
      let result: CaseEvalResult = cachedCase ? { ...cachedCase } : {
        caseId: gtCase.caseId,
        companyName: gtCase.companyName,
        isPilot: gtCase.isPilot,
        modelName: currentModel,
      };

      const checkpoint = () => {
        saveCaseCheckpoint(cacheKey, result, cache);
        generateEvaluationReport(Object.values(cache));
      };

      // 1. ALTUS
      if (gtCase.altus && gtCase.altus.capacities.length > 0 && cli.shouldRunAltus) {
        if (!cli.isFreshAltus && result.altus) {
          console.log(`  ├─ ⚡ [CACHE-HIT] Módulo ALTUS reutilizado para ${currentModel} | ${gtCase.caseId}`);
        } else {
          console.log(`  ├─ 📈 [MODULE::ALTUS] Evaluando ${gtCase.altus.capacities.length} capacidades digitales...`);
          const t0 = performance.now();
          result.altus = await evaluateAltusModule(gtCase);
          result.altus.executionTimeMs = Math.round(performance.now() - t0);
          checkpoint();
        }
      }

      // 2. SIPAC
      if (gtCase.sipac && cli.shouldRunSipac) {
        if (!cli.isFreshSipac && result.sipac) {
          console.log(`  ├─ ⚡ [CACHE-HIT] Módulo SIPAC reutilizado para ${currentModel} | ${gtCase.caseId}`);
        } else {
          console.log(`  ├─ 🧩 [MODULE::SIPAC] Re-ejecutando grafo SIPAC y evaluando taxonomía...`);
          const t0 = performance.now();
          result.sipac = await evaluateSipacModule(gtCase);
          result.sipac.executionTimeMs = Math.round(performance.now() - t0);
          checkpoint();
        }
      }

      // 3. AHP
      if (cli.shouldRunAhp) {
        if (!cli.isFreshAhp && result.ahp) {
          console.log(`  └─ ⚡ [CACHE-HIT] Módulo AHP reutilizado para ${currentModel} | ${gtCase.caseId}`);
        } else {
          console.log(`  └─ ⚖️ [MODULE::AHP] Re-ejecutando grafo AHP y evaluando priorización...`);
          const t0 = performance.now();
          result.ahp = await evaluateAhpModule(gtCase);
          result.ahp.executionTimeMs = Math.round(performance.now() - t0);
          checkpoint();
        }
      }

      result.executionTimeMs = Math.round(performance.now() - caseStartTime);
      console.log(`\n✅ CASO COMPLETADO: ${result.caseId} (${result.companyName}) | Tiempo: ${((result.executionTimeMs || 0) / 1000).toFixed(2)}s`);
      allCaseResults.push(result);
    }
  }

  const reportFile = generateEvaluationReport(Object.values(cache));
  printEvaluationSummary(allCaseResults);
  console.log(`🎉 EVALUACIÓN COMPLETA. Reporte guardado en: ${reportFile}\n`);
}

// Re-export helpers
export { evaluateFieldMatching } from "./scoring.js";
export { getSipacGroundTruthResponse, getAhpGroundTruthResponse } from "./evaluators.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  runEvaluationSuite().catch(console.error);
}
