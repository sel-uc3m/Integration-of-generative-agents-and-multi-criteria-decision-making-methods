import { GraphState, NodeResult } from "../types.js";

export async function contextProcessor(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  console.log(`[Trace][ContextProcessor] Start actionId=${action.id}`);
  return {
    currentAction: {
      ...action,
      result: action.result ?? "",
      doubtExplanation: undefined,
      doubtConfirmed: undefined,
    },
  };
}
