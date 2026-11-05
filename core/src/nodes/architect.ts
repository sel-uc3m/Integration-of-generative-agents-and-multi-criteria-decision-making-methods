import { Action, GraphState, NodeResult } from "../types.js";
import { evaluateAnswer, generateInsufficientFollowUp } from "../llm.js";
import {
  appendLatestResponseTurn,
  buildMergedAnswer,
  buildConversationHistory,
  buildTaskContextFromOutput,
} from "./helpers.js";
import { MAX_FOLLOW_UP_ATTEMPTS } from "../config.js";

export async function architect(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  console.log(`[Trace][Architect] Start actionId=${action.id}`);

  const updatedTurnsAction = appendLatestResponseTurn(action);

  // If follow-ups are disabled, skip LLM evaluation entirely
  if (state.profile?.allowFollowUps === false) {
    const aggregatedAnswer = buildMergedAnswer(
      updatedTurnsAction.transcript,
      updatedTurnsAction.result,
    );
    console.log(`[Trace][Architect] Follow-ups disabled, bypassing evaluation.`);
    return {
      currentAction: {
        ...updatedTurnsAction,
        result: aggregatedAnswer,
        followUpPrompt: undefined,
        followUpQuestion: undefined,
        nextStep: "stop",
      },
    };
  }

  const taskContext = buildTaskContextFromOutput(
    state.outputJson,
    state.currentTask?.id,
  );

  const attemptCount = (updatedTurnsAction.transcript ?? []).filter(
    (t) => t.role === "user" && t.type === "answer",
  ).length;

  console.log(`[Trace][Architect] AnswerAttemptsCount=${attemptCount}`);
  const { aggregatedAnswer, conversationHistory, ...evaluation } =
    await evaluateNextStep(
      updatedTurnsAction,
      attemptCount,
      taskContext,
      state.profile?.answerSufficiencyPrompt,
    );

  console.log(
    `[Trace][Architect] NextStep=${evaluation.nextStep} Quality=${evaluation.verdict} Confidence=${evaluation.confidence}`,
  );

  if (evaluation.nextStep === "stop") {
    return {
      currentAction: {
        ...updatedTurnsAction,
        result: aggregatedAnswer,
        followUpPrompt: undefined,
        followUpQuestion: undefined,
        nextStep: "stop",
      },
    };
  }

  const followUpQuestion = await generateInsufficientFollowUp(
    updatedTurnsAction.content,
    conversationHistory,
    taskContext,
  );

  if (!followUpQuestion || followUpQuestion.trim().length === 0) {
    console.log(`[Trace][Architect] Empty follow-up question, forcing stop.`);
    return {
      currentAction: {
        ...updatedTurnsAction,
        result: aggregatedAnswer,
        followUpPrompt: undefined,
        followUpQuestion: undefined,
        nextStep: "stop",
      },
    };
  }

  console.log(
    `[Trace][Architect] EvaluationClarificationLength=${followUpQuestion.length}`,
  );

  return {
    currentAction: {
      ...updatedTurnsAction,
      result: undefined,
      followUpPrompt: followUpQuestion,
      nextStep: "ask_follow_up",
    },
  };
}

async function evaluateNextStep(
  action: Action,
  attempts: number,
  taskContext: string,
  evaluationPrompt?: string,
) {
  const aggregatedAnswer = buildMergedAnswer(action.transcript, action.result);
  const conversationHistory = buildConversationHistory(action.transcript);
  const evaluation = await evaluateAnswer(
    action.content,
    conversationHistory,
    attempts,
    taskContext,
    evaluationPrompt,
  );

  let nextStep = evaluation.nextStep;
  if (nextStep === "ask_follow_up" && attempts >= MAX_FOLLOW_UP_ATTEMPTS) {
    nextStep = "stop";
  }

  return {
    ...evaluation,
    nextStep,
    aggregatedAnswer,
    conversationHistory,
  };
}
