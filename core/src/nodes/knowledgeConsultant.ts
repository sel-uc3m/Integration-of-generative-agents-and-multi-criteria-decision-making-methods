import { GraphState, NodeResult } from "../types.js";
import { clarifyDoubt } from "../llm.js";
import { appendUserDoubtTurn } from "./helpers.js";

export async function knowledgeConsultant(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  console.log(`[Trace][KnowledgeConsultant] Start actionId=${action.id}`);

  const updatedAction = appendUserDoubtTurn(action);
  const doubtExplanation = await consultKnowledgeBase(action.result ?? "");

  console.log(
    `[Trace][KnowledgeConsultant] DoubtExplanationLength=${doubtExplanation.length}`,
  );

  const transcript = updatedAction.transcript ?? [];

  return {
    currentAction: {
      ...updatedAction,
      doubtExplanation,
      transcript: [
        ...transcript,
        {
          role: "assistant",
          type: "clarification",
          content: doubtExplanation.trim(),
        },
      ],
    },
  };
}

async function consultKnowledgeBase(query: string): Promise<string> {
  console.log(
    `[Trace][KnowledgeConsultant] Consulting knowledge base queryLength=${query.length}`,
  );
  return clarifyDoubt(query);
}
