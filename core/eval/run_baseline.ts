import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { EVAL_PATHS, getOpenRouterLLM } from "./config.js";
import { loadAllGroundTruthCases, loadGroundTruthCase } from "./evaluators.js";
import { GroundTruthCase } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const BASELINE_PATHS = {
  baselinesDir: path.resolve(EVAL_PATHS.resultsDir, "baselines"),
};

export function buildBaselineConsultantPrompt(companyContext: string): string {
  return `Eres un Consultor Principal y Arquitecto de Software experto en Transformación Digital e Ingeniería de Requisitos para PYMEs.

A continuación, se te proporciona la información y transcripción completa sobre una empresa que desea abordar un proceso de transformación digital:

<CONTEXTO_EMPRESA>
${companyContext.trim()}
</CONTEXTO_EMPRESA>

Tu objetivo es elaborar un Plan de Preproyecto de Transformación Digital exhaustivo, profesional y directamente accionable. Para ello, razona paso a paso y estructura tu respuesta en las siguientes 4 secciones obligatorias:

1. DIAGNÓSTICO Y ANÁLISIS DE LA SITUACIÓN ACTUAL:
   - Evalúa el estado de madurez digital actual de la organización en sus diferentes áreas operativas.
   - Identifica los cuellos de botella críticos, ineficiencias de procesos y los activos/fortalezas clave de la empresa que deben preservarse.

2. PROPUESTA DE SOLUCIONES TECNOLÓGICAS (ARTEFACTOS DE SOFTWARE):
   - Propón un catálogo de soluciones tecnológicas o artefactos de software específicos adaptados a la realidad de esta empresa (evita recomendaciones genéricas o abstractas).
   - Para cada solución propuesta, detalla:
     a) Nombre concreto de la herramienta/tipo de sistema.
     b) Proceso o dolor específico del negocio que mitiga.
     c) Impacto esperado en la operativa.
     d) Un indicador clave (KPI) cuantificable para medir su éxito tras la implantación.

3. MARCO DE CRITERIOS DE DECISIÓN:
   - Define un conjunto de criterios de decisión independientes y equilibrados para evaluar y comparar las soluciones propuestas (considerando impacto en negocio, coste/esfuerzo, viabilidad técnica y adopción organizativa).

4. PRIORIZACIÓN Y HOJA DE RUTA DE IMPLANTACIÓN:
   - Establece un orden de prioridad justificado (cuáles deben implantarse en Fase 1, Fase 2, etc.).
   - Justifica detalladamente el porqué de este orden, explicando los compromisos (trade-offs) y la relación coste-beneficio de priorizar unas sobre otras frente a los criterios definidos.`;
}

export interface BaselineExecutionResult {
  caseId: string;
  companyName: string;
  model: string;
  temperature: number;
  timestamp: string;
  executionTimeMs: number;
  prompt: string;
  companyFullContext: string;
  rawOutput: string;
}

export async function runBaselineForCase(
  gtCase: GroundTruthCase,
  modelName = "google/gemini-3.7-flash",
  temperature = 0.0,
  maxTokens = 8000
): Promise<BaselineExecutionResult> {
  console.log(`\n🚀 [BASELINE] Ejecutando baseline para: ${gtCase.caseId} (${gtCase.companyName}) con ${modelName}...`);

  if (!gtCase.companyFullContext || gtCase.companyFullContext.trim().length === 0) {
    throw new Error(`El caso ${gtCase.caseId} no dispone del campo 'companyFullContext' en su Ground Truth.`);
  }

  const prompt = buildBaselineConsultantPrompt(gtCase.companyFullContext);
  const llm = getOpenRouterLLM(modelName, temperature, maxTokens);

  const startTime = Date.now();
  const messages = [
    new SystemMessage("Eres un Consultor Principal y Arquitecto de Software experto en Transformación Digital."),
    new HumanMessage(prompt),
  ];

  const response = await llm.invoke(messages);
  const executionTimeMs = Date.now() - startTime;
  const rawOutput = typeof response.content === "string" ? response.content : JSON.stringify(response.content, null, 2);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const result: BaselineExecutionResult = {
    caseId: gtCase.caseId,
    companyName: gtCase.companyName,
    model: modelName,
    temperature,
    timestamp,
    executionTimeMs,
    prompt,
    companyFullContext: gtCase.companyFullContext,
    rawOutput,
  };

  // Asegurar directorio de baselines
  if (!fs.existsSync(BASELINE_PATHS.baselinesDir)) {
    fs.mkdirSync(BASELINE_PATHS.baselinesDir, { recursive: true });
  }

  // Guardar JSON estructurado
  const jsonPath = path.join(BASELINE_PATHS.baselinesDir, `baseline_${gtCase.caseId}_${timestamp}.json`);
  const latestJsonPath = path.join(BASELINE_PATHS.baselinesDir, `baseline_${gtCase.caseId}_latest.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");
  fs.writeFileSync(latestJsonPath, JSON.stringify(result, null, 2), "utf-8");

  // Guardar Markdown legible
  const mdContent = `# Baseline LLM Plan de Transformación Digital
- **Caso:** ${gtCase.caseId} (${gtCase.companyName})
- **Modelo:** ${modelName}
- **Fecha:** ${new Date().toISOString()}
- **Tiempo de Ejecución:** ${(executionTimeMs / 1000).toFixed(2)}s
- **Temperatura:** ${temperature}

---

${rawOutput}
`;

  const mdPath = path.join(BASELINE_PATHS.baselinesDir, `baseline_${gtCase.caseId}_${timestamp}.md`);
  const latestMdPath = path.join(BASELINE_PATHS.baselinesDir, `baseline_${gtCase.caseId}_latest.md`);
  fs.writeFileSync(mdPath, mdContent, "utf-8");
  fs.writeFileSync(latestMdPath, mdContent, "utf-8");

  console.log(`✅ [BASELINE] Resultado guardado en:\n   - JSON: ${jsonPath}\n   - Markdown: ${mdPath}`);
  return result;
}

// ==========================================
// CLI Execution
// ==========================================
async function main() {
  const argv = process.argv.slice(2);
  let targetCase = "G3_empresa_c";
  let targetModel = "google/gemini-3.7-flash";
  let temperature = 0.0;
  let maxTokens = 8000;
  let runAll = false;

  for (const arg of argv) {
    if (arg.startsWith("--case=")) {
      targetCase = arg.slice(7).trim();
    } else if (arg.startsWith("--model=")) {
      targetModel = arg.slice(8).trim();
    } else if (arg.startsWith("--temperature=") || arg.startsWith("--temp=")) {
      temperature = parseFloat(arg.split("=")[1]);
    } else if (arg.startsWith("--max-tokens=") || arg.startsWith("--tokens=")) {
      maxTokens = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--all") {
      runAll = true;
    }
  }

  let casesToRun: GroundTruthCase[] = [];
  if (runAll) {
    casesToRun = loadAllGroundTruthCases();
  } else {
    casesToRun = [loadGroundTruthCase(targetCase)];
  }

  console.log(`📋 Iniciando ejecución de Baseline Directo para ${casesToRun.length} caso(s)...`);
  for (const c of casesToRun) {
    await runBaselineForCase(c, targetModel, temperature, maxTokens);
  }
  console.log(`🎉 Proceso de baseline finalizado con éxito.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("🚨 Error ejecutando baseline:", err);
    process.exit(1);
  });
}
