import { interrupt } from "@langchain/langgraph";
import * as readline from "readline";
import {
  consumeScriptedResponse,
  consumeDynamicFallback,
} from "../scripted.js";

export interface ScriptedLookup {
  actionId: string;
  source?: string;
  taskId?: string;
  questionIndex?: number;
}

export interface PromptOptions {
  lookup: ScriptedLookup;
  prompt: string;
  type?: "question" | "confirmation";
  questionText?: string;
  summaryContext?: string;
  enableDynamicFallback?: boolean;
}

/**
 * Handles requesting input from either scripted queue, dynamic simulator fallback,
 * LangGraph web interrupt, or Node.js CLI readline.
 */
export async function promptUser(options: PromptOptions): Promise<string> {
  const {
    lookup,
    prompt,
    type = "question",
    questionText = "",
    summaryContext = "",
    enableDynamicFallback = false,
  } = options;

  // 1. Scripted store
  const scripted = consumeScriptedResponse(lookup);
  if (scripted !== null) {
    console.log(
      `[Trace][Interaction] UsingScriptedResponse actionId=${lookup.actionId}`,
    );
    return scripted.trim();
  }

  // 2. Dynamic Simulator (if hooked from the evaluator)
  if (enableDynamicFallback) {
    const dynamicSimulated = await consumeDynamicFallback(
      lookup,
      questionText || prompt,
    );
    if (dynamicSimulated !== null) {
      console.log(
        `[Trace][Interaction] UsingDynamicSimulatedResponse actionId=${lookup.actionId}`,
      );
      return dynamicSimulated.trim();
    }
  }

  // 3. Web UI Interrupt
  if (process.env.TFM_WEB === "true") {
    const interruptPayload =
      type === "confirmation"
        ? {
            type: "confirmation",
            actionId: lookup.actionId,
            taskId: lookup.taskId,
            prompt,
          }
        : {
            type: "question",
            actionId: lookup.actionId,
            taskId: lookup.taskId,
            prompt,
            question: questionText || prompt,
            summaryContext,
          };

    const response = interrupt(interruptPayload) as string;
    return (response || "").trim();
  }

  // 4. CLI Readline fallback
  return askReadline(prompt);
}

function askReadline(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`\n[Question] ${prompt}\n> `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
