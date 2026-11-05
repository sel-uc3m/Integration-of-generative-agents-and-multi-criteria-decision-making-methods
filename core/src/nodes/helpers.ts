import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Action, TranscriptMessage, Task } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildActionOutputKey(
  task: Task | null,
  action: Action,
): string {
  const taskId = task?.id ?? "unknown_task";
  return `record:${taskId}:${action.id}`;
}

export function appendUserDoubtTurn(action: Action): Action {
  const latestDoubt = (action.result ?? "").trim();
  if (latestDoubt.length === 0) return action;

  const transcript = action.transcript ?? [];

  // Evitar duplicados si ya se registró
  const lastMsg = transcript[transcript.length - 1];
  if (lastMsg?.role === "user" && lastMsg?.type === "doubt" && lastMsg?.content === latestDoubt) {
    return action;
  }

  return {
    ...action,
    transcript: [
      ...transcript,
      {
        role: "user",
        type: "doubt",
        content: latestDoubt,
      },
    ],
  };
}

export function appendLatestResponseTurn(action: Action): Action {
  const askedQuestion = action.followUpPrompt?.trim() || action.content.trim();
  const latestAnswer = (action.result ?? "").trim();

  if (latestAnswer.length === 0) {
    return action;
  }

  const transcript = action.transcript ?? [];

  // Check if we are duplicating the last appended sequence
  const isDuplicatedLatestTurn =
    transcript.length >= 2 &&
    transcript[transcript.length - 1].content === latestAnswer &&
    transcript[transcript.length - 2].content === askedQuestion;

  if (isDuplicatedLatestTurn) {
    return action;
  }

  const newMessages: TranscriptMessage[] = [];

  newMessages.push({
    role: "assistant",
    type: "question",
    content: askedQuestion,
  });

  newMessages.push({
    role: "user",
    type: "answer",
    content: latestAnswer,
  });

  return {
    ...action,
    transcript: [...transcript, ...newMessages],
  };
}

export function buildMergedAnswer(
  transcript: TranscriptMessage[] | undefined,
  result: string | undefined,
): string {
  const parts = (transcript ?? [])
    .filter((t) => t.role === "user" && t.type === "answer")
    .map((t) => t.content.trim())
    .filter((t) => t.length > 0);

  const latestAnswer = (result ?? "").trim();

  const mergedFromTranscript = parts.join(" ");

  // If result already represents the full merged transcript, avoid duplicating it.
  if (
    latestAnswer &&
    normalizeWhitespace(latestAnswer) === normalizeWhitespace(mergedFromTranscript)
  ) {
    return mergedFromTranscript;
  }

  // Add result if it's not already the last part
  if (latestAnswer && parts[parts.length - 1] !== latestAnswer) {
    parts.push(latestAnswer);
  }

  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

export function buildPartialBreakdown(action: Action): TranscriptMessage[] {
  const transcript = action.transcript ?? [];
  const finalAnswer = (action.result ?? "").trim();
  const finalQuestion = action.followUpPrompt?.trim() || action.content.trim();

  const normalizedTranscript = transcript.map(m => ({
    ...m,
    content: m.content.trim()
  })).filter(m => m.content.length > 0);

  if (finalAnswer.length === 0) {
    return normalizedTranscript;
  }

  const mergedUserAnswers = normalizedTranscript
    .filter((m) => m.role === "user" && m.type === "answer")
    .map((m) => m.content)
    .join(" ");

  if (normalizeWhitespace(finalAnswer) === normalizeWhitespace(mergedUserAnswers)) {
    return normalizedTranscript;
  }

  const lastMsg = normalizedTranscript[normalizedTranscript.length - 1];
  const secondLastMsg = normalizedTranscript[normalizedTranscript.length - 2];

  const isDuplicatedFinalTurn =
    Boolean(lastMsg) &&
    Boolean(secondLastMsg) &&
    lastMsg.role === "user" && lastMsg.content === finalAnswer &&
    secondLastMsg.content === finalQuestion;

  if (isDuplicatedFinalTurn) {
    return normalizedTranscript;
  }

  const completedTranscript = [...normalizedTranscript];

  completedTranscript.push({
    role: "assistant",
    type: "question",
    content: finalQuestion,
  });

  completedTranscript.push({
    role: "user",
    type: "answer",
    content: finalAnswer,
  });

  return completedTranscript;
}

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function buildConversationHistory(transcript: TranscriptMessage[] | undefined): string {
  if (!transcript || transcript.length === 0) return "";
  return transcript
    .map((t) => {
      const roleName = t.role === "assistant" ? "Interviewer" : "Candidate";
      return `${roleName}: ${t.content}`;
    })
    .join("\n\n");
}

export function buildTaskContextFromOutput(
  outputJson: Record<string, any>,
  taskId: string | undefined,
): string {
  if (!taskId) return "";

  const taskEntries = Object.values(outputJson)
    .filter((entry: any) => entry.task_id === taskId)
    .sort((a: any, b: any) => {
      // Basic heuristic to keep them in order if possible
      return (a.action_id || "").localeCompare(b.action_id || "");
    });

  if (taskEntries.length === 0) return "";

  return taskEntries
    .map((entry: any, index: number) =>
      `Previous Question ${index + 1}: ${entry.question}\nPrevious Answer Summary ${index + 1}: ${entry.summary}`,
    )
    .join("\n\n");
}

export async function saveOutputFile(
  data: Record<string, unknown>,
  outputFileName?: string,
): Promise<void> {
  try {
    const resultsDir = join(__dirname, "../../results");
    await mkdir(resultsDir, { recursive: true });

    const conversationData: Record<string, unknown> = {};
    const variablesData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Los nodos de conversación tienen el formato 'source:taskId:actionId' y son objetos que contienen 'action_id'
      if (key.includes(':') && typeof value === 'object' && value !== null && 'action_id' in value) {
        conversationData[key] = value;
      } else {
        variablesData[key] = value;
      }
    }

    const defaultName = "output.json";
    const baseName = outputFileName && outputFileName.trim().length > 0 ? outputFileName : defaultName;

    // Guardar fichero de conversación
    const filePath = join(resultsDir, baseName);
    await writeFile(filePath, JSON.stringify(conversationData, null, 2), "utf-8");

    // Guardar fichero de variables
    const variablesFileName = baseName.startsWith("output_")
      ? baseName.replace("output_", "variables_")
      : `variables_${baseName}`;
    const variablesPath = join(resultsDir, variablesFileName);
    await writeFile(variablesPath, JSON.stringify(variablesData, null, 2), "utf-8");

    console.log(
      `[Trace][SaveOutputFile] Saved ${filePath} (keys=${Object.keys(conversationData).length}) and ${variablesPath} (keys=${Object.keys(variablesData).length})`,
    );
  } catch (error) {
    console.error(`[Error] Could not save output file:`, error);
  }
}
