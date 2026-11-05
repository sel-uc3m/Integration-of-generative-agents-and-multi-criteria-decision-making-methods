import { GraphState, NodeResult } from "../types.js";
import { executeInternalReasoning } from "../llm.js";
import { buildMergedAnswer } from "./helpers.js";
import { interpolateTemplate, safeParseJson } from "../utils/template.js";

export async function executeActionHook(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  const hook = state.profile?.hooks?.afterActionAnswer;
  if (!hook) return {};

  console.log(`[Trace][ExecuteActionHook] Executing afterActionAnswer hook for actionId=${action.id}`);

  const summary = action.summary ?? buildMergedAnswer(action.transcript, action.result);
  
  // Format variables in the instruction
  const templateContext: Record<string, unknown> = {
    ...state.outputJson,
    summary,
    question: action.content,
  };
  const instruction = interpolateTemplate(hook.instruction, templateContext);

  const systemPrompt = `${instruction}\n\nCRITICAL RULE: Return ONLY a valid JSON object matching the requested schema. No preambles or chat conversational text.`;
  const userPrompt = `Question asked to candidate: "${action.content}"\nCandidate's response summary: "${summary}"`;

  const resultStr = await executeInternalReasoning(systemPrompt, userPrompt, hook.outputSchema);

  try {
    const hookResults = safeParseJson<Record<string, any>>(resultStr);
    
    // Save outputVar globally if configured
    const updatedOutputJson = { ...state.outputJson };
    if (hook.outputVar) {
      updatedOutputJson[hook.outputVar] = hookResults;
    }

    return {
      currentAction: {
        ...action,
        hookResults,
      },
      outputJson: updatedOutputJson,
    };
  } catch (error) {
    console.error(`[ExecuteActionHook] Failed to parse hook results JSON: ${error}. Result: ${resultStr}`);
    return {};
  }
}

