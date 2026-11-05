import { Action, GraphState, NodeResult } from "../types.js";
import { interpolateTemplate } from "../utils/template.js";

export async function extractAction(state: GraphState): Promise<NodeResult> {
  let [currentAction, ...remainingActions] = state.actionQueue;

  if (!currentAction) return {
    currentAction: undefined,
    actionQueue: [],
  };

  // If the action is a loop, we "unroll" it into multiple actions
  if (currentAction.type === "loop_validation") {
    
    // Check if unrolling is disabled (e.g. from the evaluator)
    if (process.env.EVAL_UNROLLING === "false") {
      const unrollType = currentAction.unrollType || "question";
      currentAction.type = unrollType;
      
      let sourceData = state.outputJson[currentAction.sourceVar!];
      let contextStr = typeof sourceData === "object" ? JSON.stringify(sourceData, null, 2) : String(sourceData);

      if (unrollType === "internal") {
        currentAction.instruction = (currentAction.templateInstruction || "") + "\n\nCONTEXTO ARRAY COMPLETO a procesar en un solo paso:\n" + contextStr;
        currentAction.outputSchema = {
          type: "array",
          items: currentAction.outputSchema || { type: "object" }
        };
      } else {
        currentAction.content = (currentAction.templateQuestion || "") + "\n\nDATOS A VALIDAR:\n" + contextStr;
      }

      return {
        currentAction,
        actionQueue: remainingActions,
      };
    }

    let loopSourceRaw = state.outputJson[currentAction.sourceVar!];
    let loopSource: any[] = [];
    
    if (Array.isArray(loopSourceRaw)) {
      loopSource = loopSourceRaw;
    } else if (loopSourceRaw && typeof loopSourceRaw === 'object') {
      // Si el LLM devuelve un objeto que envuelve el array (ej: { activos: [...] })
      const arrayValues = Object.values(loopSourceRaw).filter(Array.isArray);
      if (arrayValues.length > 0) {
        loopSource = arrayValues[0] as any[];
      } else {
        loopSource = [loopSourceRaw];
      }
    } else if (loopSourceRaw) {
      loopSource = [loopSourceRaw];
    }

    const unrollType = currentAction.unrollType || "question";

    const unrolledActions: Action[] = loopSource.map((item, index) => {
      const content = interpolateTemplate(currentAction.templateQuestion || "", item);
      const instruction = interpolateTemplate(currentAction.templateInstruction || "", item);

      return {
        id: `${currentAction.id}_${index}`,
        type: unrollType,
        content: unrollType === "question" ? content : "",
        instruction: unrollType === "internal" ? instruction : undefined,
        outputVarItem: currentAction.outputVarItem,
        loopMetadata: {
          originalActionId: currentAction.id,
          itemIndex: index,
          sourceVar: currentAction.sourceVar!,
        },
      };
    });

    // Update the queue with unrolled actions and move to the first one
    [currentAction, ...remainingActions] = [
      ...unrolledActions,
      ...remainingActions,
    ];
  }

  // General Variable Interpolation
  // Replace placeholders like {variable_name} with the actual stringified value from outputJson
  if (currentAction.content) {
    currentAction.content = interpolateTemplate(currentAction.content, state.outputJson);
  }
  if (currentAction.instruction) {
    currentAction.instruction = interpolateTemplate(currentAction.instruction, state.outputJson);
  }

  return {
    currentAction,
    actionQueue: remainingActions,
  };
}


