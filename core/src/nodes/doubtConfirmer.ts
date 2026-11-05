import { Action, GraphState, NodeResult, TranscriptMessage } from "../types.js";
import { promptUser } from "../services/interaction.js";

const DEFAULT_CONFIRMATION_PROMPT =
  "No tengo claro si lo que acabas de decir era una duda sobre la pregunta. Responde \"si\" si quieres una aclaracion o \"no\" si me estabas contestando.";

const POSITIVE_CONFIRMATIONS = new Set([
  "si",
  "sí",
  "s",
  "yes",
  "y",
  "claro",
  "correcto",
  "exacto",
]);

export async function doubtConfirmer(state: GraphState): Promise<NodeResult> {
  const action = state.currentAction;
  if (!action) return {};

  console.log(`[Trace][DoubtConfirmer] Start actionId=${action.id}`);

  const confirmation = await promptUser({
    lookup: {
      actionId: action.id,
      source: undefined,
      taskId: state.currentTask?.id,
      questionIndex: buildConfirmationQuestionIndex(action),
    },
    prompt: DEFAULT_CONFIRMATION_PROMPT,
    type: "confirmation",
  });

  const normalizedConfirmation = normalizeConfirmation(confirmation);
  const confirmed = POSITIVE_CONFIRMATIONS.has(normalizedConfirmation);

  console.log(
    `[Trace][DoubtConfirmer] Confirmation="${normalizedConfirmation}" Confirmed=${confirmed ? "yes" : "no"}`,
  );

  return {
    currentAction: {
      ...action,
      doubtConfirmed: confirmed,
      doubtExplanation: undefined,
      followUpPrompt: undefined,
    },
  };
}

function buildConfirmationQuestionIndex(action: Action): number {
  const transcriptCount = (action.transcript ?? []).filter(
    (t: TranscriptMessage) => t.role === "user" && t.type === "answer",
  ).length;
  return transcriptCount + 1;
}

function normalizeConfirmation(value: string): string {
  return value.trim().toLowerCase();
}

