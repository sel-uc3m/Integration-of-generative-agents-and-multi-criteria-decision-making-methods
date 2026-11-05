import { GraphState, NodeResult } from "../types.js";
import { summarizeActionAnswer } from "../llm.js";
import { buildMergedAnswer, buildPartialBreakdown } from "./helpers.js";

export async function actionAnswerSummarizer(
  state: GraphState,
): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  console.log(
    `[Trace][ActionAnswerSummarizer] Start actionId=${action.id} type=${action.type}`,
  );

  const completeAnswer = buildMergedAnswer(action.transcript, action.result);
  const transcript = buildPartialBreakdown(action);

  // Filter only the user's answers for summarization to avoid consultant noise
  const summaryTurns = transcript
    .filter(t => t.type === "question" || (t.role === "user" && t.type === "answer"))
    .map(t => ({
      question: t.type === "question" ? t.content : "",
      answer: t.role === "user" && t.type === "answer" ? t.content : ""
    }))
    // Reduce into QA pairs
    .reduce((acc, curr) => {
      if (curr.question) {
        acc.push({ question: curr.question, answer: "" });
      } else if (curr.answer && acc.length > 0) {
        acc[acc.length - 1].answer = curr.answer;
      }
      return acc;
    }, [] as Array<{ question: string, answer: string }>)
    .filter(pair => pair.answer.length > 0);

  let summary = completeAnswer;
  if (action.type !== "internal" && summaryTurns.length > 1 && completeAnswer.trim().length > 0) {
    summary = await summarizeActionAnswer(
      action.content,
      summaryTurns,
      completeAnswer,
    );
  }

  console.log(
    `[Trace][ActionAnswerSummarizer] completeLength=${completeAnswer.length} summaryTurnsCount=${summaryTurns.length} summaryLength=${summary.length}`,
  );

  return {
    currentAction: {
      ...action,
      completeAnswer,
      transcript,
      summary,
    },
  };
}
