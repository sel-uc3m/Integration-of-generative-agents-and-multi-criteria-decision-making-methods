import { GraphState, NodeResult } from "../types.js";
import { summarizeTask } from "../llm.js";
import { buildActionOutputKey, saveOutputFile } from "./helpers.js";

export async function taskSummarizer(state: GraphState): Promise<NodeResult> {
  const currentTask = state.currentTask;
  if (!currentTask) return {};

  console.log(
    `[Trace][TaskSummarizer] Start taskId=${currentTask.id} taskName=${currentTask.name}`,
  );

  if (state.profile?.generateTaskSummaries === false) {
    console.log(`[Trace][TaskSummarizer] Skipping summary generation because generateTaskSummaries is false`);
    return {};
  }

  const qaPairs = currentTask.actions
    .map((action) => {
      const outputKey = buildActionOutputKey(currentTask, action);
      const value = state.outputJson[outputKey];
      if (!value || typeof value !== "object") return null;
      const record = value as {
        question?: string;
        summary?: string;
        complete_answer?: string;
        answer?: string;
      };
      return {
        question: record.question ?? action.content,
        answer: record.summary ?? record.complete_answer ?? record.answer ?? "",
      };
    })
    .filter(
      (pair): pair is { question: string; answer: string } => pair !== null,
    );

  console.log(`[Trace][TaskSummarizer] PairCount=${qaPairs.length}`);

  if (qaPairs.length === 0) return {};

  const summary = await summarizeTask(currentTask.name, qaPairs);
  const taskSummaryKey = currentTask.id;
  const taskSummaries = {
    ...state.taskSummaries,
    [taskSummaryKey]: summary,
  };

  if (!state.profile?.saveTaskSummariesToOutput) {
    return {
      taskSummaries,
    };
  }

  const updatedOutput = {
    ...state.outputJson,
    [`${taskSummaryKey}:summary`]: {
      task_id: currentTask.id,
      action_id: "task_summary",
      summary: summary
    },
  };

  await saveOutputFile(updatedOutput, state.outputFileName);

  console.log(`[Trace][TaskSummarizer] SummaryLength=${summary.length}`);

  return {
    taskSummaries,
    outputJson: updatedOutput,
  };
}
