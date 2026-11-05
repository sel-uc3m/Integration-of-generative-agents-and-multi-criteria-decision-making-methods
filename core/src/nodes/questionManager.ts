import { Action, GraphState, NodeResult } from "../types.js";
import {
  extractAnswerFromSummaries,
  mergeClarificationWithQuestion,
} from "../llm.js";
import { hasScriptedResponseFor } from "../scripted.js";
import { buildTaskContextFromOutput } from "./helpers.js";
import { promptUser } from "../services/interaction.js";

export async function questionManager(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  console.log(
    `[Trace][QuestionManager] Start actionId=${action.id} type=${action.type}`,
  );
  console.log(`[Trace][QuestionManager] Question=${action.content}`);

  const summaryContext = getCombinedSummaryContext(state);
  console.log(
    `[Trace][QuestionManager] SummaryContextPresent=${summaryContext ? "yes" : "no"}`,
  );

  const questionIndex = (action.transcript ?? []).filter(
    (t) => t.role === "user",
  ).length;

  const scriptedLookup = {
    actionId: action.id,
    source: undefined,
    taskId: state.currentTask?.id,
    questionIndex,
  };

  // 1. Try deducing answer from accumulated summaries if applicable
  const hasScripted = hasScriptedResponseFor(scriptedLookup);
  if (summaryContext && !action.followUpPrompt && !hasScripted) {
    const deducedAnswer = await tryExtractAnswerFromSummary(summaryContext, action.content);
    if (deducedAnswer) {
      console.log(
        `[Trace][QuestionManager] UsingSummaryAnswer actionId=${action.id}`,
      );
      return {
        currentAction: {
          ...action,
          followUpQuestion: action.content,
          result: deducedAnswer,
        },
      };
    }
  }

  // 2. Resolve question text (handling doubts / follow-up prompts)
  const questionText = await resolveQuestionText(action);

  console.log(
    `[Trace][QuestionManager] FollowUpPromptPresent=${Boolean(action.followUpPrompt) ? "yes" : "no"}`,
  );
  console.log(
    `[Trace][QuestionManager] DoubtExplanationPresent=${Boolean(action.doubtExplanation) ? "yes" : "no"}`,
  );
  console.log(`[Trace][QuestionManager] FinalQuestionLength=${questionText.length}`);

  // 3. Ask user (or consume scripted / dynamic simulated response)
  const prompt = formatQuestionPrompt(questionText, summaryContext);
  const response = await promptUser({
    lookup: scriptedLookup,
    prompt,
    questionText,
    summaryContext,
    enableDynamicFallback: true,
  });

  console.log(`[Trace][QuestionManager] ResponseLength=${response.length}`);

  return {
    currentAction: {
      ...action,
      followUpQuestion: questionText,
      result: response,
    },
  };
}

function getCombinedSummaryContext(state: GraphState): string {
  const longTermContext = buildSummaryContext(state.taskSummaries);
  const shortTermContext = buildTaskContextFromOutput(
    state.outputJson,
    state.currentTask?.id,
  );
  return [longTermContext, shortTermContext].filter(Boolean).join("\n\n");
}

function buildSummaryContext(taskSummaries: Record<string, string>): string {
  const entries = Object.entries(taskSummaries);
  if (entries.length === 0) return "";
  return entries.map(([id, summary]) => `Task ${id}: ${summary}`).join("\n");
}

function formatQuestionPrompt(
  question: string,
  summaryContext: string,
): string {
  const parts: string[] = [];
  if (summaryContext) parts.push(`Context summaries:\n${summaryContext}`);
  parts.push(question);
  return parts.join("\n\n");
}

async function resolveQuestionText(action: Action): Promise<string> {
  let questionText = action.followUpPrompt || action.content;
  if (action.doubtExplanation) {
    questionText = await mergeClarificationWithQuestion(
      questionText,
      action.doubtExplanation,
    );
  }
  return questionText;
}

async function tryExtractAnswerFromSummary(
  summaryContext: string,
  question: string,
): Promise<string | null> {
  const extracted = await extractAnswerFromSummaries(summaryContext, question);
  const normalized = extracted.trim().toLowerCase();
  const isValidAnswer = Boolean(
    extracted &&
    normalized !== "{}" &&
    normalized !== "[]" &&
    normalized !== '""' &&
    normalized !== "n/a" &&
    normalized !== "none" &&
    normalized !== "undefined" &&
    normalized !== "null"
  );
  console.log(
    `[Trace][QuestionManager] ExtractedFromSummaries=${isValidAnswer ? "yes" : "no"} Placeholder=${normalized ? "yes" : "no"}`,
  );
  return isValidAnswer ? extracted : null;
}

