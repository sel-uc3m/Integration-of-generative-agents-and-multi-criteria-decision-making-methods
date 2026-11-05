import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Filesystem paths resolved dynamically.
 */
export const EVAL_PATHS = {
  root: path.resolve(__dirname, ".."),
  evalDir: __dirname,
  groundTruthDir: path.resolve(__dirname, "ground_truth"),
  questionsDir: path.resolve(__dirname, "../../questions"),
  questionsAltus: path.resolve(__dirname, "../../questions/preguntas-ALTUS.json"),
  questionsSipac: path.resolve(__dirname, "../../questions/preguntas-SIPAC.json"),
  questionsAhp: path.resolve(__dirname, "../../questions/preguntas-AHP.json"),
  resultsDir: path.resolve(__dirname, "../results"),
  evaluationsDir: path.resolve(__dirname, "../results/evaluations"),
  cacheFile: path.resolve(__dirname, "../results/evaluations/eval_cache.json"),
  reportFile: path.resolve(__dirname, "../results/evaluations/eval_report_latest.json"),
};

/**
 * Default evaluation parameters and models.
 */
export const EVAL_CONFIG = {
  defaultSystemModel: process.env.EVAL_MODEL || "qwen3.5:4b-mlx",
  defaultJudgeModel: process.env.EVAL_JUDGE_MODEL || "google/gemini-2.5-flash",
  defaultSimulatorModel: process.env.EVAL_SIMULATOR_MODEL || "meta-llama/llama-3.3-70b-instruct",
  defaultEmbeddingModel: process.env.LOCAL_EMBEDDING_MODEL || "nomic-embed-text",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  cloudBaseUrl: process.env.CLOUD_BASE_URL || "",
  tauStar: parseFloat(process.env.EVAL_TAU_STAR || "0.35"),
  requestDelayMs: parseInt(process.env.EVAL_REQUEST_DELAY_MS || "0", 10),
  recursionLimits: {
    altus: 1500,
    sipac: 500,
    ahp: 500,
  },
  batchSize: {
    sipacMatching: 25,
  },
};

let lastLLMCallTimestamp = 0;

/**
 * Paces LLM calls to prevent burst rate limits.
 */
export async function rateLimitedLLMCall<T>(callFn: () => Promise<T>): Promise<T> {
  const minInterval = EVAL_CONFIG.requestDelayMs;
  if (minInterval > 0) {
    const now = Date.now();
    const timeSinceLast = now - lastLLMCallTimestamp;
    if (timeSinceLast < minInterval) {
      await new Promise((r) => setTimeout(r, minInterval - timeSinceLast));
    }
  }
  try {
    return await callFn();
  } finally {
    lastLLMCallTimestamp = Date.now();
  }
}

/**
 * Returns a ChatOpenAI client pointing to OpenRouter (or fallback local API).
 */
export function getOpenRouterLLM(
  modelOverride?: string,
  temperatureOverride?: number,
  maxTokensOverride?: number
): ChatOpenAI {
  const modelName = modelOverride || EVAL_CONFIG.defaultJudgeModel;
  const apiKey = process.env.CLOUD_API_KEY?.trim();
  const baseURL = process.env.CLOUD_BASE_URL?.trim();

  if (!apiKey || !baseURL) {
    throw new Error(
      "[Eval Judge/Simulator] La suite de evaluación requiere CLOUD_API_KEY y CLOUD_BASE_URL definidas en el .env para los jueces y simuladores online."
    );
  }

  return new ChatOpenAI({
    modelName,
    configuration: {
      baseURL,
      apiKey,
      defaultHeaders: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/TFM",
        "X-Title": "TFM Agent Evaluator",
      },
    },
    apiKey,
    openAIApiKey: apiKey,
    temperature: temperatureOverride !== undefined ? temperatureOverride : 0.0,
    maxTokens: maxTokensOverride !== undefined ? maxTokensOverride : 2000,
  });
}

/**
 * Extracts and cleans JSON object or array from raw LLM text response.
 */
export function extractJsonFromText(rawText: string): any {
  const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const targetStr = markdownMatch ? markdownMatch[1].trim() : cleaned;

  const jsonMatch = targetStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`No JSON structure found in text: "${rawText.slice(0, 120)}..."`);
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Helper to retry an async function with adaptive backoff.
 */
export async function retryWithBackoff<T>(
  fn: (lastError?: Error, attempt?: number) => Promise<T>,
  options: { maxRetries?: number; initialDelayMs?: number; description?: string } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5;
  const initialDelay = options.initialDelayMs ?? 1500;
  const description = options.description ?? "Llamada LLM";
  let lastErr: Error | undefined = undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fn(lastErr, attempt);
      if (attempt > 1) {
        console.log(`🟢 [RECOVERED] ${description} completado en intento ${attempt}/${maxRetries}.`);
      }
      return res;
    } catch (error: any) {
      lastErr = error instanceof Error ? error : new Error(String(error));
      const isRateLimit = String(lastErr.message).includes("429") || String(lastErr.message).includes("rate limit");

      if (attempt === maxRetries) {
        console.error(`🚨 [ERROR] ${description} agotó todos los reintentos (${maxRetries}/${maxRetries}).`);
        throw lastErr;
      }

      const waitMs = isRateLimit ? 10000 * attempt : initialDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ [RETRY] ${description} falló (intento ${attempt}/${maxRetries}): ${lastErr.message}. Reintentando en ${waitMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastErr || new Error(`Excedido número máximo de reintentos (${maxRetries}) para ${description}`);
}

/**
 * Invokes an LLM Judge with structured JSON output and self-correcting retries.
 */
export async function invokeStructuredJudge<T>(params: {
  schema: z.ZodType<T>;
  prompt: string;
  systemMessage?: string;
  modelOverride?: string;
  temperature?: number;
  maxRetries?: number;
  description?: string;
  preprocessor?: (parsed: any) => any;
}): Promise<T> {
  const maxRetries = params.maxRetries ?? 5;
  const description = params.description ?? "LLM Judge";
  const systemMsg = params.systemMessage ?? "You are a strict technical evaluator. Output only valid JSON.";

  return retryWithBackoff(
    async (lastErr, attempt = 1) => {
      const temp = params.temperature !== undefined ? params.temperature : (attempt >= 4 ? 0.4 : 0.0);
      const llm = getOpenRouterLLM(params.modelOverride, temp);

      const messages: Array<SystemMessage | HumanMessage> = [
        new SystemMessage(systemMsg),
        new HumanMessage(params.prompt),
      ];

      if (lastErr) {
        messages.push(
          new HumanMessage(
            `⚠️ CORRECCIÓN DE FORMATO: Tu intento anterior falló con el error: "${lastErr.message}". ` +
              `Asegúrate de responder ÚNICAMENTE con un JSON válido que cumpla estrictamente con la estructura solicitada.`
          )
        );
      }

      const res = await rateLimitedLLMCall(() => llm.invoke(messages));
      const content = typeof res.content === "string" ? res.content : JSON.stringify(res.content);

      let parsed = extractJsonFromText(content);
      if (params.preprocessor) {
        parsed = params.preprocessor(parsed);
      }

      return params.schema.parse(parsed);
    },
    { maxRetries, description }
  );
}
