import { readFile } from "fs/promises";
import { ScriptedEntry } from "./types.js";

/**
 * In-process store for scripted responses loaded from a JSON file.
 *
 * Lifecycle:
 *   1. Call `loadScriptedResponses(path)` once at startup.
 *   2. Each call to `consumeScriptedResponse(...)` returns the next
 *      queued response that matches source/task/action and removes it,
 *      or returns `null` if no scripted response is available (falling back
 *      to stdin).
 *
 * JSON format expected:
 * [
 *   { "actionId": "q1", "response": "Soy ingeniero de software." },
 *   { "source": "altus", "taskId": "1_CONF", "actionId": "1", "response": "..." },
 *   { "source": "altus", "taskId": "1_CONF", "actionId": "1", "questionIndex": 0, "response": "..." },
 *   { "source": "altus", "taskId": "1_CONF", "actionId": "1", "questionIndex": 1, "response": "..." }
 * ]
 *
 * Matching priority when consuming:
 * 1) scoped + question index (`source + taskId + actionId + questionIndex`)
 * 2) scoped (`source + taskId + actionId`)
 * 3) fallback legacy (`actionId`)
 */

let queue: ScriptedEntry[] = [];
let loaded = false;

export async function loadScriptedResponses(filePath: string): Promise<void> {
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Scripted responses file must be a JSON array. Got: ${typeof parsed}`,
    );
  }

  for (const entry of parsed) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).actionId !== "string" ||
      typeof (entry as Record<string, unknown>).response !== "string"
    ) {
      throw new Error(
        `Each entry must have { actionId: string, response: string }. Got: ${JSON.stringify(entry)}`,
      );
    }

    const record = entry as Record<string, unknown>;
    if (
      (record.source !== undefined &&
        typeof record.source !== "string") ||
      (record.taskId !== undefined &&
        typeof record.taskId !== "string") ||
      (record.questionIndex !== undefined &&
        (!Number.isInteger(record.questionIndex) ||
          (record.questionIndex as number) < 0))
    ) {
      throw new Error(
        `Optional fields must be valid when present: { source?: string, taskId?: string, questionIndex?: integer>=0 }. Got: ${JSON.stringify(entry)}`,
      );
    }
  }

  queue = parsed as ScriptedEntry[];
  loaded = true;

  console.log(
    `[Scripted] Loaded ${queue.length} scripted response(s) from ${filePath}`,
  );
}

/**
 * Returns and removes the next scripted response for the given actionId,
 * or null if no scripted response is available for it.
 */
type ScriptedLookup = {
  actionId: string;
  source?: string;
  taskId?: string;
  questionIndex?: number;
};

export function consumeScriptedResponse(lookup: ScriptedLookup): string | null {
  if (!loaded || queue.length === 0) return null;

  let bestIndex = -1;
  let bestScore = -1;

  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];

    const scopedEntry = Boolean(entry.taskId);
    const entryHasQuestionIndex = entry.questionIndex !== undefined;
    const scopedWithQuestionIndexMatch =
      scopedEntry &&
      entryHasQuestionIndex &&
      entry.actionId === lookup.actionId &&
      entry.taskId === lookup.taskId &&
      entry.questionIndex === lookup.questionIndex;

    if (scopedWithQuestionIndexMatch) {
      if (bestScore < 3) {
        bestScore = 3;
        bestIndex = i;
      }
      continue;
    }

    const scopedMatch =
      scopedEntry &&
      !entryHasQuestionIndex &&
      entry.actionId === lookup.actionId &&
      entry.taskId === lookup.taskId;

    if (scopedMatch) {
      if (bestScore < 2) {
        bestScore = 2;
        bestIndex = i;
      }
      continue;
    }

    const legacyMatch = !scopedEntry && entry.actionId === lookup.actionId;

    if (legacyMatch && bestScore < 1) {
      bestScore = 1;
      bestIndex = i;
    }
  }

  const index = bestIndex;
  if (index === -1) return null;

  const [entry] = queue.splice(index, 1);
  console.log(
    `[Scripted] Consuming response for actionId="${lookup.actionId}" source="${lookup.source ?? ""}" taskId="${lookup.taskId ?? ""}" questionIndex="${lookup.questionIndex ?? ""}" remaining=${queue.length}`,
  );
  return entry.response;
}

export function hasScriptedResponseFor(lookup: ScriptedLookup): boolean {
  if (!loaded || queue.length === 0) return false;
  
  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];

    const scopedEntry = Boolean(entry.taskId);
    const entryHasQuestionIndex = entry.questionIndex !== undefined;
    const scopedWithQuestionIndexMatch =
      scopedEntry &&
      entryHasQuestionIndex &&
      entry.actionId === lookup.actionId &&
      entry.taskId === lookup.taskId &&
      entry.questionIndex === lookup.questionIndex;

    if (scopedWithQuestionIndexMatch) return true;

    const scopedMatch =
      scopedEntry &&
      !entryHasQuestionIndex &&
      entry.actionId === lookup.actionId &&
      entry.taskId === lookup.taskId;

    if (scopedMatch) return true;

    const legacyMatch = !scopedEntry && entry.actionId === lookup.actionId;
    if (legacyMatch) return true;
  }
  
  return false;
}

/** Returns true when there are still pending scripted responses. */
export function hasScriptedResponses(): boolean {
  return loaded && queue.length > 0;
}

/** Resets the store (used in tests). */
export function resetScriptedStore(entries: ScriptedEntry[] = []): void {
  queue = [...entries];
  loaded = entries.length > 0;
}

// --- Dynamic Fallback Hook for Evaluation (Simulator) ---
export type DynamicFallbackFn = (lookup: ScriptedLookup, question: string) => Promise<string | null>;
let dynamicFallback: DynamicFallbackFn | null = null;

export function setDynamicResponses(fn: DynamicFallbackFn | null) {
  dynamicFallback = fn;
}

export async function consumeDynamicFallback(lookup: ScriptedLookup, question: string): Promise<string | null> {
  if (dynamicFallback) {
    return await dynamicFallback(lookup, question);
  }
  return null;
}
