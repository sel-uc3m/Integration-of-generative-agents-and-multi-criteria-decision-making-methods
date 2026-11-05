import { loadEvalCache, saveCaseCheckpoint } from "./runner.js";
import { loadAllGroundTruthCases, evaluateAltusModule } from "./evaluators.js";
import { CaseEvalResult } from "./types.js";
import { generateEvaluationReport, printEvaluationSummary } from "./reporter.js";

/**
 * Specialized runner script that evaluates ONLY the blind test cases (G2, G3, G4)
 * for the ALTUS digital maturity module across all models found in the evaluation cache.
 */
export async function runAltusBlindTests() {
  console.log("=================================================================");
  console.log("🚀 EVALUACIÓN FOCALIZADA: ALTUS EN CASOS DE TEST CIEGO (G2, G3, G4)");
  console.log("=================================================================");

  // 1. Cargar cache existente para obtener los modelos ya evaluados
  const cache = loadEvalCache();
  const cacheModels = [...new Set(Object.keys(cache).map((k) => k.split("::")[0]))].filter(Boolean);

  // Permitir sobreescribir modelos o casos por CLI si se pasa --models=... o --case=...
  const args = process.argv.slice(2);
  let modelsToRun: string[] = [];
  let targetCases: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--models=")) {
      modelsToRun = arg.slice(9).split(",").map((m) => m.trim()).filter(Boolean);
    } else if (arg.startsWith("--model=")) {
      modelsToRun = [arg.slice(8).trim()];
    } else if (arg.startsWith("--cases=") || arg.startsWith("--case=")) {
      const val = arg.includes("=") ? arg.split("=")[1] : "";
      targetCases = val.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
    }
  }

  if (modelsToRun.length === 0) {
    modelsToRun = cacheModels.length > 0 ? cacheModels : ["deepseek-r1:7b", "ornith:9b", "gemma4:12b-mlx"];
  }

  // 2. Cargar exclusivamente los casos de Test Ciego (isPilot === false: G2, G3, G4)
  const allCases = loadAllGroundTruthCases();
  let blindCases = allCases.filter((c) => !c.isPilot && c.altus && c.altus.capacities.length > 0);

  if (targetCases.length > 0) {
    blindCases = blindCases.filter((c) => targetCases.some((tc) => c.caseId.toLowerCase().includes(tc)));
  }

  if (blindCases.length === 0) {
    console.error("❌ No se encontraron casos de test ciego que coincidan con el filtro.");
    return;
  }

  console.log(`\n📋 Modelos a evaluar (${modelsToRun.length}):`, modelsToRun.join(", "));
  console.log(
    `📋 Casos de Test Ciego (${blindCases.length}):`,
    blindCases.map((c) => `${c.caseId} (${c.companyName})`).join(", ")
  );
  console.log("-----------------------------------------------------------------");

  const totalSteps = modelsToRun.length * blindCases.length;
  let currentStep = 0;
  const updatedCases: CaseEvalResult[] = [];

  for (let mIdx = 0; mIdx < modelsToRun.length; mIdx++) {
    const currentModel = modelsToRun[mIdx];
    process.env.EVAL_MODEL = currentModel;

    console.log(`\n=================================================================`);
    console.log(`🤖 [MODELO ${mIdx + 1}/${modelsToRun.length}] EVALUANDO SISTEMA: ${currentModel}`);
    console.log(`=================================================================`);

    for (let cIdx = 0; cIdx < blindCases.length; cIdx++) {
      currentStep++;
      const gtCase = blindCases[cIdx];
      const cacheKey = `${currentModel}::${gtCase.caseId}`;

      console.log(`\n-----------------------------------------------------------------`);
      console.log(
        `📌 [PROGRESO GLOBAL ${currentStep}/${totalSteps}] CASO: ${gtCase.caseId} (${gtCase.companyName}) | MODELO: ${currentModel}`
      );
      console.log(`   Evaluando ${gtCase.altus!.capacities.length} capacidades de madurez digital...`);
      console.log(`-----------------------------------------------------------------`);

      const t0 = performance.now();
      const altusResult = await evaluateAltusModule(gtCase);
      altusResult.executionTimeMs = Math.round(performance.now() - t0);

      // Actualizar o crear la entrada en caché conservando sipac y ahp intactos
      let result: CaseEvalResult = cache[cacheKey]
        ? { ...cache[cacheKey], altus: altusResult, modelName: currentModel }
        : {
            caseId: gtCase.caseId,
            companyName: gtCase.companyName,
            isPilot: false,
            modelName: currentModel,
            altus: altusResult,
          };

      // Guardar checkpoint inmediatamente tras cada caso
      saveCaseCheckpoint(cacheKey, result, cache);
      generateEvaluationReport(Object.values(cache));
      updatedCases.push(result);

      console.log(`\n✅ COMPLETADO: ${gtCase.caseId} (${gtCase.companyName}) con ${currentModel}`);
      console.log(`⏱️  Tiempo: ${(altusResult.executionTimeMs / 1000).toFixed(2)}s`);
      console.log(
        `📊 ALTUS -> Accuracy: ${(altusResult.accuracy * 100).toFixed(1)}% | MAE: ${altusResult.mae.toFixed(
          2
        )} | Redundancia: ${(altusResult.redundancyRate * 100).toFixed(1)}% | Paradas Prematuras: ${
          altusResult.prematureStopCount
        } | Turnos Medios: ${altusResult.averageTurnCount} | Calidad Repreguntas: ${altusResult.averageFollowUpQuality}/3.0`
      );
    }
  }

  console.log("\n=================================================================");
  console.log("🎉 EVALUACIÓN DE TEST CIEGO ALTUS FINALIZADA CON ÉXITO");
  console.log("=================================================================");
  printEvaluationSummary(updatedCases);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAltusBlindTests().catch(console.error);
}
