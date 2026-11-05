import { GraphState, NodeResult } from "../types.js";
import { executeInternalReasoning } from "../llm.js";
import { readFile } from "fs/promises";
import path from "path";
import { interpolateTemplate, safeParseJson } from "../utils/template.js";

const knowledgeBaseCache = new Map<string, string>();

async function loadKnowledgeBaseContext(
  knowledgeBase?: Array<{ name: string; path: string }>
): Promise<string> {
  if (!knowledgeBase || knowledgeBase.length === 0) return "";

  let kbSection = "\n\nMETHODOLOGY CONTEXT:\n";
  for (const [index, kbItem] of knowledgeBase.entries()) {
    try {
      const fullPath = path.resolve(process.cwd(), kbItem.path);
      if (!knowledgeBaseCache.has(fullPath)) {
        const content = await readFile(fullPath, "utf-8");
        knowledgeBaseCache.set(fullPath, content);
      }
      const content = knowledgeBaseCache.get(fullPath) || "";
      kbSection += `${index + 1}. ${kbItem.name}:\n${content}\n\n`;
    } catch (err) {
      console.error(
        `[InternalAction] Failed to load knowledge base file '${kbItem.name}' at path '${kbItem.path}':`,
        err
      );
    }
  }
  return kbSection;
}

export async function executeInternalAction(
  state: GraphState,
): Promise<NodeResult> {
  const action = state.currentAction;
  const task = state.currentTask;
  if (!action || !task) return {};

  console.log(
    `[Trace][InternalAction] Start actionId=${action.id} type=${action.type}`,
  );

  const updatedOutputJson = { ...state.outputJson };

  // 1. Build methodology context from profile knowledgeBase files (cached & async)
  const kbSection = await loadKnowledgeBaseContext(state.profile?.knowledgeBase);

  const systemPrompt =
    (state.profile?.systemPrompt ||
      "You are a strategic consultant expert. Your goal is to perform internal reasoning to assist with the interview process.") +
    kbSection +
    `\nCRITICAL RULE: Return ONLY a valid JSON object or array as requested. No conversational text.`;

  // 2. Format user instruction and inject variable dependencies
  const formattedInstruction = interpolateTemplate(action.instruction || "", state.outputJson);
  const userPrompt = `INSTRUCTION:\n${formattedInstruction}`;

  const result = await executeInternalReasoning(
    systemPrompt,
    userPrompt,
    action.outputSchema,
  );

  // 3. Save result if outputVar is defined
  if (action.outputVar) {
    try {
      const parsedResult = safeParseJson(result, result);
      updatedOutputJson[action.outputVar] = parsedResult;
    } catch (e) {
      console.warn(`[InternalAction] Failed to parse JSON result for outputVar ${action.outputVar}: ${e}`);
      updatedOutputJson[action.outputVar] = result;
    }
  }

  console.log(`[Trace][InternalAction] ResultLength=${result.length}`);

  return {
    currentAction: {
      ...action,
      result,
    },
    outputJson: updatedOutputJson,
    actionQueue: state.actionQueue,
  };
}

