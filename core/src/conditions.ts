import {
  GraphState,
  AnswerEvaluationNextStep,
  RouterDecision,
  ActionType,
} from "./types.js";
import { classifyResponse } from "./llm.js";
import { DOUBT_THRESHOLDS, MAX_DOUBT_ATTEMPTS } from "./config.js";

export async function checkTaskQueue(
  state: GraphState,
): Promise<"empty" | "hasTask"> {
  return state.isComplete ? "empty" : "hasTask";
}

export async function checkActionQueue(
  state: GraphState,
): Promise<"empty" | "hasAction"> {
  return state.actionQueue.length === 0 ? "empty" : "hasAction";
}

export async function determineActionType(
  state: GraphState,
): Promise<ActionType> {
  return state.currentAction?.type ?? "question";
}

export async function router(state: GraphState): Promise<RouterDecision> {
  const action = state.currentAction;
  if (!action?.result) return "response";

  // If knowledge consultation is disabled, bypass doubt flow completely
  if (state.profile?.allowKnowledgeConsultation === false) {
    return "response";
  }

  // Guard against infinite doubt loops on the same action
  const previousClarifications = (action.transcript ?? []).filter(
    (t) => t.type === "clarification",
  ).length;
  if (previousClarifications >= MAX_DOUBT_ATTEMPTS) {
    console.log(
      `[Trace][Router] Max doubt attempts reached (${MAX_DOUBT_ATTEMPTS}) for actionId=${action.id}, routing to response`,
    );
    return "response";
  }

  if (action.doubtConfirmed === true) {
    return "doubt";
  }

  if (action.doubtConfirmed === false) {
    return "response";
  }

  const question = action.followUpQuestion || action.content;
  const classification = await classifyResponse(action.result, question);

  if (classification.intent !== "doubt") {
    return "response";
  }

  if (classification.confidence >= DOUBT_THRESHOLDS.CONFIRMED) {
    return "doubt";
  }

  // If doubt confirmation is allowed, go to confirm_doubt. Otherwise treat as normal response.
  if (
    state.profile?.allowDoubtConfirmation !== false &&
    classification.confidence >= DOUBT_THRESHOLDS.AMBIGUOUS
  ) {
    return "confirm_doubt";
  }

  return "response";
}

/**
 * Determines the next node after the architect evaluates the answer sufficiency.
 */
export async function checkArchitectDecision(
  state: GraphState,
): Promise<AnswerEvaluationNextStep> {
  return state.currentAction?.nextStep ?? "stop";
}
