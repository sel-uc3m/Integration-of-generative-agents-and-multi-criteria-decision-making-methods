import { ChatOpenAI } from "@langchain/openai";
import { AsyncLocalStorage } from "node:async_hooks";
import { attachCustomStructuredOutput } from "./structuredOutput.js";

export interface LLMContextStore {
  model?: string;
  classifierModel?: string;
  reasonerModel?: string;
}

export const llmContext = new AsyncLocalStorage<LLMContextStore>();

const _llmCache = new Map<string, ChatOpenAI>();

export function getLLMInstance(
  model: string,
  temperature: number,
  maxTokens = 4000,
  timeout = 300000,
): ChatOpenAI {
  const cacheKey = `${model}-${temperature}-${maxTokens}-${timeout}`;
  if (!_llmCache.has(cacheKey)) {
    const isCloudModel = model.includes("/");
    const rawApiKey = process.env.CLOUD_API_KEY?.trim();
    const rawBaseUrl = process.env.CLOUD_BASE_URL?.trim();

    let apiKey: string;
    let baseURL: string;

    if (isCloudModel) {
      // 1. Modelo Cloud (ej: qwen/qwen-3.5-27b, openai/gpt5)
      if (!rawApiKey || !rawBaseUrl) {
        throw new Error(
          `[LLM Client] Para ejecutar el modelo cloud "${model}" se requieren CLOUD_API_KEY y CLOUD_BASE_URL definidas en el .env.`
        );
      }
      apiKey = rawApiKey;
      baseURL = rawBaseUrl;
    } else {
      // 2. Modelo Local de Ollama (ej: deepseek-r1:7b, ornith:9b)
      apiKey = "ollama";
      baseURL = process.env.OLLAMA_BASE_URL
        ? `${process.env.OLLAMA_BASE_URL.replace(/\/v1\/?$/, "")}/v1`
        : "http://localhost:11434/v1";
    }

    const instance = new ChatOpenAI({
      modelName: model,
      configuration: {
        baseURL,
        apiKey,
        defaultHeaders: isCloudModel
          ? {
              "HTTP-Referer": "https://github.com/TFM",
              "X-Title": "TFM Agent Evaluator",
            }
          : undefined,
      },
      apiKey,
      openAIApiKey: apiKey,
      temperature,
      maxTokens,
      timeout,
    });

    attachCustomStructuredOutput(instance);
    _llmCache.set(cacheKey, instance);
  }
  return _llmCache.get(cacheKey)!;
}

export function getClassifierLLM(temperature = 0): ChatOpenAI {
  const store = llmContext.getStore();
  let model = store?.classifierModel || store?.model;
  if (!model || model === "default") {
    const isHybrid = process.env.EVAL_HYBRID === "true";
    model = isHybrid
      ? process.env.EVAL_CLASSIFIER &&
        process.env.EVAL_CLASSIFIER !== "default"
        ? process.env.EVAL_CLASSIFIER
        : "deepseek-r1:7b"
      : process.env.EVAL_MODEL && process.env.EVAL_MODEL !== "default"
        ? process.env.EVAL_MODEL
        : "deepseek-r1:7b";
  }
  return getLLMInstance(model, temperature);
}

export function getReasonerLLM(
  temperature = 0,
  maxTokens = 4000,
  timeout = 300000,
): ChatOpenAI {
  const store = llmContext.getStore();
  let model = store?.reasonerModel || store?.model;
  if (!model || model === "default") {
    const isHybrid = process.env.EVAL_HYBRID === "true";
    model = isHybrid
      ? process.env.EVAL_REASONER && process.env.EVAL_REASONER !== "default"
        ? process.env.EVAL_REASONER
        : "deepseek-r1:7b"
      : process.env.EVAL_MODEL && process.env.EVAL_MODEL !== "default"
        ? process.env.EVAL_MODEL
        : "deepseek-r1:7b";
  }
  return getLLMInstance(model, temperature, maxTokens, timeout);
}

export const llm = new Proxy({} as ChatOpenAI, {
  get(_target, prop, receiver) {
    // Default to the small/fast model for simple conversational tasks
    const instance = getClassifierLLM();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
