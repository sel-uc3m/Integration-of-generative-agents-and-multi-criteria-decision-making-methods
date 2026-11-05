import { GraphState, NodeResult } from "../types.js";
import { executeInternalReasoning } from "../llm.js";
import { interpolateTemplate, safeParseJson } from "../utils/template.js";

export async function executeTaskHook(state: GraphState): Promise<NodeResult> {
  const task = state.currentTask;
  if (!task) return {};

  const hook = state.profile?.hooks?.afterTask;
  if (!hook) return {};

  console.log(`[Trace][ExecuteTaskHook] Executing afterTask hook for taskId=${task.id}`);

  // Format variables in the instruction
  const instruction = interpolateTemplate(hook.instruction, state.outputJson);

  const systemPrompt = `${instruction}\n\nCRITICAL RULE: Return ONLY a valid JSON object matching the requested schema. No preambles or chat conversational text.`;
  const userPrompt = `Task completed: "${task.name}" (ID: ${task.id})`;

  const resultStr = await executeInternalReasoning(systemPrompt, userPrompt, hook.outputSchema);

  try {
    const hookResults = safeParseJson<Record<string, any>>(resultStr);
    
    const updatedOutputJson = { ...state.outputJson };
    if (hook.outputVar) {
      updatedOutputJson[hook.outputVar] = hookResults;
    } else {
      // If no outputVar is specified, save it under taskId:hook_result
      updatedOutputJson[`${task.id}:hook_result`] = hookResults;
    }

    return {
      outputJson: updatedOutputJson,
    };
  } catch (error) {
    console.error(`[ExecuteTaskHook] Failed to parse hook results JSON: ${error}. Result: ${resultStr}`);
    return {};
  }
}

