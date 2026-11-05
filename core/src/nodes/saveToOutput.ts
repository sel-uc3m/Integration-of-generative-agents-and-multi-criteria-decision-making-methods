import { GraphState, NodeResult } from "../types.js";
import {
  buildActionOutputKey,
  buildMergedAnswer,
  buildPartialBreakdown,
  saveOutputFile,
} from "./helpers.js";
import { safeParseJson } from "../utils/template.js";

export async function saveToOutput(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  const task = state.currentTask;
  if (!action) return state;

  console.log(`[Trace][SaveToOutput] Saving actionId=${action.id}`);

  const outputKey = buildActionOutputKey(task, action);

  const completeAnswer =
    action.completeAnswer ?? buildMergedAnswer(action.transcript, action.result);
  const transcript = buildPartialBreakdown(action);
  const summary = action.summary ?? completeAnswer;

  let updatedOutput = {
    ...state.outputJson,
    [outputKey]: {
      task_id: task?.id ?? "unknown_task",
      action_id: action.id,
      ...(task?.metadata ?? {}),
      ...(action.hookResults ?? {}),
      question: action.content,
      summary,
      complete_answer: completeAnswer,
      partial: transcript,
    },
  };

  // Logic to save unrolled loop results back into the source array
  if (action.loopMetadata && action.outputVarItem) {
    const { sourceVar, itemIndex } = action.loopMetadata;
    let sourceVal = updatedOutput[sourceVar];
    let actualArray: any[] | null = null;

    if (Array.isArray(sourceVal)) {
      actualArray = sourceVal;
    } else if (sourceVal && typeof sourceVal === 'object') {
      const arrayValues = Object.values(sourceVal).filter(Array.isArray);
      if (arrayValues.length > 0) {
        actualArray = arrayValues[0] as any[];
      } else {
        actualArray = [sourceVal];
        updatedOutput[sourceVar] = actualArray;
      }
    } else if (sourceVal !== undefined) {
      actualArray = [sourceVal];
      updatedOutput[sourceVar] = actualArray;
    }

    if (actualArray && actualArray[itemIndex] !== undefined) {
      if (typeof actualArray[itemIndex] !== 'object' || actualArray[itemIndex] === null) {
        actualArray[itemIndex] = { value: actualArray[itemIndex] };
      }
      let finalValue: any = summary;
      if (action.type === "internal") {
        try {
          finalValue = safeParseJson(summary, summary);
        } catch (e) {
          console.warn(`[SaveToOutput] Failed to parse internal loop summary: ${e}`);
        }
      }
      actualArray[itemIndex][action.outputVarItem] = finalValue;
    }
  }

  // Save the answer to a global variable if outputVar is defined
  // For 'internal' actions, this might already be set in executeInternalAction,
  // but for 'question' actions we want to save the summary (or completeAnswer)
  if (action.type !== "internal") {
    const hasHookResults = action.hookResults && Object.keys(action.hookResults).length > 0;
    const finalVal = hasHookResults
      ? { ...action.hookResults, summary }
      : summary;

    if (action.outputVar) {
      updatedOutput[action.outputVar] = finalVal;
    } else if (!action.loopMetadata) {
      // Generar clave explícita taskId:actionId (ej. 1_CONF:1) como espera el usuario
      const variableKey = task ? `${task.id}:${action.id}` : action.id;
      updatedOutput[variableKey] = finalVal;
    }
  }

  await saveOutputFile(updatedOutput, state.outputFileName);

  console.log(`[Trace][SaveToOutput] OutputSize=${Object.keys(updatedOutput).length}`);

  return {
    outputJson: updatedOutput,
    currentAction: null,
  };
}
