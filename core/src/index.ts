import { createGraph, createInitialState } from "./graph.js";
import { GraphState } from "./types.js";
import { loadSession } from "./loaders.js";
import { loadScriptedResponses } from "./scripted.js";
import { DEFAULT_VERBOSITY_MODE, DEFAULT_RECURSION_LIMIT } from "./config.js";
import { createLogger, setVerbosityMode } from "./logger.js";
import { generateProcessSummary } from "./llm.js";
import { readFile } from "fs/promises";

function parseScriptedFlag(argv: string[]): string | null {
  const idx = argv.indexOf("--scripted");
  if (idx !== -1 && argv[idx + 1]) {
    return argv[idx + 1];
  }
  return null;
}

function parseStateFlag(argv: string[]): string | null {
  const idx = argv.indexOf("--state");
  if (idx !== -1 && argv[idx + 1]) {
    return argv[idx + 1];
  }
  return null;
}

function parseVerbosityFlag(argv: string[]) {
  const idx = argv.indexOf("--verbosity");
  const value = idx !== -1 ? argv[idx + 1] : undefined;
  return value === "concise" || value === "verbose"
    ? value
    : DEFAULT_VERBOSITY_MODE;
}

function parseRecursionLimitFlag(argv: string[]): number {
  const idx = argv.indexOf("--recursion-limit");
  const value = idx !== -1 ? parseInt(argv[idx + 1], 10) : undefined;
  return value !== undefined && !isNaN(value)
    ? value
    : DEFAULT_RECURSION_LIMIT;
}

function parseQuestionsFlag(argv: string[]): string[] {
  const idx = argv.indexOf("--questions");
  if (idx !== -1 && argv.length > idx + 1) {
    const paths: string[] = [];
    for (let i = idx + 1; i < argv.length; i++) {
      if (argv[i].startsWith("--")) break;
      paths.push(argv[i]);
    }
    if (paths.length > 0) return paths;
  }
  throw new Error("Missing required argument: --questions <path1> [path2...]");
}

async function main() {
  const questionsPaths = parseQuestionsFlag(process.argv);
  const verbosity = parseVerbosityFlag(process.argv);
  setVerbosityMode(verbosity);
  const logger = createLogger();
  const recursionLimit = parseRecursionLimitFlag(process.argv);

  const startTime = new Date().toISOString();
  logger.info(`[Log/System] Startup time: ${startTime}`);
  logger.info(`[Log/System] Verbosity mode: ${verbosity}`);
  logger.info(`[Log/System] Recursion limit: ${recursionLimit}`);

  const scriptedPath = parseScriptedFlag(process.argv);
  if (scriptedPath) {
    logger.info(`[Log/System] Scripted mode: loading responses from ${scriptedPath}`);
    await loadScriptedResponses(scriptedPath);
  }

  let carriedContextMap: Record<string, string> = {};
  let carriedOutputJson: Record<string, any> = {};

  const stateFile = parseStateFlag(process.argv);
  if (stateFile) {
    try {
      logger.info(`[Log/System] Loading initial state from ${stateFile}`);
      const raw = await readFile(stateFile, "utf-8");
      carriedOutputJson = JSON.parse(raw);
    } catch(e) {
      logger.error(`[Log/System] Error loading state file: ${e}`);
    }
  }

  for (let i = 0; i < questionsPaths.length; i++) {
    const questionsPath = questionsPaths[i];
    logger.info(`\n[Log/System] --- Starting Session ${i + 1}/${questionsPaths.length}: ${questionsPath} ---`);
    
    const { sessionId, profile, tasks } = await loadSession(questionsPath);
    const graph = createGraph(profile);
    
    const prefix = profile.processName ? `output_${profile.processName}` : "output";
    const baseInitialState = createInitialState(profile, prefix);
    
    logger.verbose(`[Log/System] Session ID: ${sessionId}`);
    
    const stateWithTasks: GraphState = {
      ...baseInitialState,
      taskQueue: tasks,
      contextMap: { ...baseInitialState.contextMap, ...carriedContextMap },
      outputJson: { ...baseInitialState.outputJson, ...carriedOutputJson },
    };

    const totalActions = tasks.reduce((acc, t) => acc + t.actions.length, 0);
    logger.verbose(`[Log/Tasks] Tasks loaded: ${tasks.length}, Actions: ${totalActions}`);

    try {
      const finalState: GraphState = await graph.invoke(stateWithTasks, {
        recursionLimit: recursionLimit,
      });
      
      carriedContextMap = { ...carriedContextMap, ...(finalState.contextMap || {}) };
      carriedOutputJson = { ...carriedOutputJson, ...finalState.outputJson };
      
      logger.verbose(`[Log/Graph] Session completed.`);
      
      if (i < questionsPaths.length - 1 && Object.keys(finalState.taskSummaries).length > 0) {
        logger.info(`[Log/System] Generating Process Summary for ${questionsPath}...`);
        const processName = profile.processName || `Proceso_${i + 1}`;
        const processSummary = await generateProcessSummary(processName, finalState.taskSummaries);
        
        const previousSummary = carriedContextMap["previous_processes_summary"] || "";
        carriedContextMap["previous_processes_summary"] = previousSummary 
          ? `${previousSummary}\n\n--- Resumen ${processName} ---\n${processSummary}`
          : `--- Resumen ${processName} ---\n${processSummary}`;
        
        logger.verbose(`[Log/System] Process Summary generated and injected into carriedContextMap.`);
      }

      if (i === questionsPaths.length - 1) {
        logger.info("\n=== Execution Complete ===\n");
        logger.info(`[Log/Output] Final Output entries: ${Object.keys(carriedOutputJson).length}`);
        logger.verbose(JSON.stringify(carriedOutputJson, null, 2));
      }
    } catch (error) {
      logger.error(`Error during graph execution of ${questionsPath}:`, error);
      break;
    }
  }
}

if (process.argv.includes("--questions")) {
  main().catch(console.error);
}

export { main };
export { createGraph, createInitialState } from "./graph.js";
export { loadSession } from "./loaders.js";
export { generateProcessSummary, llmContext } from "./llm.js";
export * from "./altus_logic.js";
export * from "./sipac_logic.js";
export * from "./ahp_logic.js";
export * from "./types.js";
export * from "./theme.js";
