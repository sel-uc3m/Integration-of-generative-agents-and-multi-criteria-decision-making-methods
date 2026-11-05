import { StakeholderSimulationSchema, StakeholderSimulationOutput } from "./schemas.js";
import { buildStakeholderPrompt } from "./prompts.js";
import { invokeStructuredJudge, EVAL_CONFIG } from "./config.js";

/**
 * Simulates a business stakeholder responding to an agent's follow-up interview question in ALTUS.
 */
export async function simulateStakeholder(params: {
  companyName: string;
  companyFullContext: string;
  sessionTranscriptHistory: string;
  agentFollowupQuestion: string;
  modelOverride?: string;
}): Promise<StakeholderSimulationOutput> {
  const modelName = params.modelOverride || EVAL_CONFIG.defaultSimulatorModel;
  const apiKey = process.env.CLOUD_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

  const prompt = buildStakeholderPrompt({
    companyName: params.companyName,
    companyFullContext: params.companyFullContext,
    sessionTranscriptHistory: params.sessionTranscriptHistory,
    agentFollowupQuestion: params.agentFollowupQuestion,
  });

  if (apiKey && apiKey !== "dummy-key") {
    try {
      return await invokeStructuredJudge({
        schema: StakeholderSimulationSchema,
        prompt,
        modelOverride: modelName,
        systemMessage:
          "You are a roleplaying stakeholder in an organizational interview. Output strictly valid JSON conforming to the schema.",
        description: `Simulador Stakeholder [${params.companyName}]`,
        preprocessor: (parsed) => {
          if (!parsed.reasoning && (parsed.justification || parsed.reason || parsed.explanation)) {
            parsed.reasoning = parsed.justification || parsed.reason || parsed.explanation;
          }
          return parsed;
        },
      });
    } catch (e) {
      console.warn("[Simulator] Fallaron los reintentos para el Simulador LLM:", e);
    }
  }

  return {
    isRedundant: false,
    response:
      "Como comenté anteriormente, estamos trabajando en formalizar ese proceso y adaptar la tecnología necesaria.",
    reasoning: "Fallback simulation response generated due to missing LLM configuration.",
  };
}
