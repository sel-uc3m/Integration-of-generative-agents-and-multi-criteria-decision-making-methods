import fs from "node:fs";
import path from "node:path";
import { CaseEvalResult } from "./types.js";
import { EVAL_PATHS } from "./config.js";

/**
 * Generates and saves evaluation JSON report and outputs summary to console.
 */
export function generateEvaluationReport(results: CaseEvalResult[], outputPath?: string): string {
  const timestamp = new Date().toISOString();

  const reportData = {
    generatedAt: timestamp,
    totalCases: results.length,
    pilotCases: results.filter((r) => r.isPilot).length,
    blindCases: results.filter((r) => !r.isPilot).length,
    results: results,
  };

  const targetPath = outputPath || EVAL_PATHS.reportFile;
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`[Reporter] Reporte JSON guardado en: ${targetPath}`);

  return targetPath;
}

/**
 * Prints a clean summary table to the console for a set of evaluation results.
 */
export function printEvaluationSummary(results: CaseEvalResult[]): void {
  console.log("\n=================================================================");
  console.log("📊 RESUMEN FINAL DE EVALUACIÓN DE AGENTES");
  console.log("=================================================================");
  console.log(`Total Casos: ${results.length} | Pilotos: ${results.filter((r) => r.isPilot).length} | Blind: ${results.filter((r) => !r.isPilot).length}`);
  console.log("-----------------------------------------------------------------");

  for (const r of results) {
    const typeLabel = r.isPilot ? "[PILOTO]" : "[BLIND]";
    console.log(`\n🏢 ${typeLabel} ${r.caseId} (${r.companyName}) | Modelo: ${r.modelName || "N/A"}`);
    if (r.executionTimeMs) {
      console.log(`   ⏱️ Tiempo: ${(r.executionTimeMs / 1000).toFixed(2)}s`);
    }

    if (r.altus && typeof r.altus.accuracy === "number") {
      console.log(
        `   📈 ALTUS -> Acc: ${(r.altus.accuracy * 100).toFixed(1)}% | MAE: ${(r.altus.mae ?? 0).toFixed(2)} | Redundancia: ${(
          (r.altus.redundancyRate ?? 0) * 100
        ).toFixed(1)}% | Calidad Preguntas: ${(r.altus.averageFollowUpQuality ?? 0).toFixed(2)}/3.0`
      );
    }
    if (r.sipac && r.sipac.giaMetrics) {
      console.log(
        `   🧩 SIPAC -> F1 Global: ${((r.sipac.overallF1 ?? 0) * 100).toFixed(1)}% (GIA: ${(
          (r.sipac.giaMetrics?.f1 ?? 0) * 100
        ).toFixed(1)}% | AI: ${((r.sipac.activoIntangibleMetrics?.f1 ?? 0) * 100).toFixed(1)}% | CI: ${(
          (r.sipac.intellectusCiMetrics?.f1 ?? 0) * 100
        ).toFixed(1)}% | Artefactos: ${((r.sipac.artefactosMetrics?.f1 ?? 0) * 100).toFixed(1)}% | KPIs: ${(
          (r.sipac.indicadoresMetrics?.f1 ?? 0) * 100
        ).toFixed(1)}%)`
      );
    }
    if (r.ahp && typeof r.ahp.normalizedScore === "number") {
      console.log(
        `   ⚖️ AHP   -> Calidad Asistencia: ${(r.ahp.normalizedScore * 100).toFixed(1)}% (${r.ahp.totalScore}/12)`
      );
    }
  }
  console.log("=================================================================\n");
}
