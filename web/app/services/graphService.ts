process.env.TFM_WEB = "true"; // Crucial: ensure web mode is active for @tfm/core graph compilation

import { 
  createGraph, 
  createInitialState, 
  loadSession, 
  generateProcessSummary, 
  llmContext,
  calcAltusScores,
  calcSipacScores,
  classifySipacQuadrant,
  calcAhp
} from "@tfm/core";
import { GraphState, GraphProfile } from "@tfm/core";

function runWithSessionModel<T>(profile: GraphProfile | undefined, fn: () => Promise<T>): Promise<T> {
  const modelConfig = profile?.modelConfig;
  const store = {
    model: modelConfig?.model || process.env.EVAL_MODEL,
    classifierModel: modelConfig?.classifier || process.env.EVAL_CLASSIFIER,
    reasonerModel: modelConfig?.reasoner || process.env.EVAL_REASONER
  };
  return llmContext.run(store, fn);
}

import { Command } from "@langchain/langgraph";
import { join, resolve } from "path";
import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { updateActiveNode, logLLMStart, logLLMEnd, logNodeStart, logNodeEnd } from "./traceService";
import { 
  saveSession, 
  saveResult, 
  listSessionsFromDb, 
  getResultFromDb, 
  getSessionFromDb,
  deleteExpiredSessions
} from "./dbService";

/** Callback fired during graph execution to stream intermediate events over SSE. */
export type GraphEventCallback = (event: string, data: unknown) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTraceCallbacks(sessionId: string, onEvent?: GraphEventCallback): Record<string, any> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleChainStart: (chain: any, inputs: any, runId: string, parentRunId?: string, tags?: string[], metadata?: any) => {
      const node = metadata?.langgraph_node;
      if (node && node !== "__start__" && node !== "__end__") {
        updateActiveNode(sessionId, node);
        logNodeStart(sessionId, runId, node, inputs);
        onEvent?.("node_active", { node });
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleChainEnd: (output: any, runId: string) => {
      logNodeEnd(sessionId, runId, output);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleLLMStart: (llm: any, prompts: string[], runId: string) => {
      const model = llm?.model || llm?.modelName || llm?.kwargs?.model || "unknown";
      logLLMStart(sessionId, runId, model, prompts);
      onEvent?.("llm_start", { model, runId });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleLLMEnd: (output: any, runId: string) => {
      const response = output?.generations?.[0]?.[0]?.text || output?.generations?.[0]?.[0]?.message?.content || "";
      logLLMEnd(sessionId, runId, response);
      onEvent?.("llm_end", { runId });
    }
  };
}


export interface ProcessDescriptor {
  type: "file" | "custom";
  fileName?: string;
  customData?: any;
}

export interface SessionInfo {
  sessionId: string;
  processName: string;
  status: "ready" | "running" | "completed" | "interrupted";
  createdAt: string;
  lastActiveAt: string;
  questionsFile?: string;
  questionsFiles?: ProcessDescriptor[];
  currentFileIndex?: number;
  profile?: GraphProfile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  firstInterrupt?: any;
}

// In-memory session metadata
const sessionsMap = new Map<string, SessionInfo>();

// Default fallback profile configuration
const defaultProfile: GraphProfile = {
  allowFollowUps: true,
  allowDoubtConfirmation: true,
  allowKnowledgeConsultation: true,
  generateTaskSummaries: true,
  saveTaskSummariesToOutput: true,
  hooks: {},
};

// Singleton graph instance compiled with MemorySaver checkpointer
export const appGraph = createGraph(defaultProfile);

/**
 * Resolves the absolute path for the results directory.
 * Standardizes to point to the root `/results` folder for consistency.
 */
export function getResultsDir(): string {
  if (existsSync(resolve(process.cwd(), "results"))) {
    return resolve(process.cwd(), "results");
  }
  return resolve(process.cwd(), "../results");
}

/**
 * Resolves the absolute path to the questions directory.
 */
export function getQuestionsDir(): string {
  if (existsSync(resolve(process.cwd(), "questions"))) {
    return resolve(process.cwd(), "questions");
  }
  return resolve(process.cwd(), "../questions");
}

/**
 * Lists all available predefined questions JSON files in the `/questions` directory.
 */
export async function listQuestionsFiles(): Promise<Array<{ name: string; file: string }>> {
  const dir = getQuestionsDir();
  if (!existsSync(dir)) {
    return [];
  }
  const files = await readdir(dir);
  const jsonFiles = files.filter(f => f.endsWith(".json"));
  
  const results = [];
  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(dir, file), "utf-8");
      const parsed = JSON.parse(content);
      const name = parsed.processName || parsed.name || file.replace("preguntas-", "").replace(".json", "").toUpperCase();
      results.push({ name, file });
    } catch {
      results.push({ name: file.replace(".json", ""), file });
    }
  }
  return results;
}

/**
 * Initializes a new evaluation session.
 */
export async function initSession(params: {
  processSource: "file" | "custom";
  fileName?: string;
  fileNames?: string[];
  customProcess?: any;
  pipeline?: ProcessDescriptor[];
  modelConfig?: Record<string, string>;
}, onEvent?: GraphEventCallback): Promise<SessionInfo> {
  const sessionId = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessionData: any;

  let pipeline: ProcessDescriptor[] = [];
  if (params.pipeline && params.pipeline.length > 0) {
    pipeline = params.pipeline;
  } else if (params.processSource === "file") {
    const files = params.fileNames && params.fileNames.length > 0 ? params.fileNames : (params.fileName ? [params.fileName] : []);
    pipeline = files.map(f => ({ type: "file", fileName: f }));
  } else if (params.processSource === "custom" && params.customProcess) {
    // If custom process has a knowledgeBase with content, write them to files and set the paths
    if (params.customProcess.knowledgeBase && Array.isArray(params.customProcess.knowledgeBase)) {
      const kb = params.customProcess.knowledgeBase;
      const docsDir = join(getQuestionsDir(), "docs");
      
      // Ensure docs directory exists
      try {
        await mkdir(docsDir, { recursive: true });
      } catch (e) {
        // Ignore if exists
      }

      for (let i = 0; i < kb.length; i++) {
        const doc = kb[i];
        if (doc && doc.content !== undefined) {
          const docFileName = `custom_kb_${sessionId}_${i}.txt`;
          const fullPath = join(docsDir, docFileName);
          
          await writeFile(fullPath, doc.content || "", "utf-8");
          
          // Update the item to point to the saved file
          doc.path = fullPath;
          delete doc.content; // Remove text content from the metadata database to save space
        }
      }
    }
    pipeline = [{ type: "custom", customData: params.customProcess }];
  }

  if (pipeline.length === 0) {
    throw new Error("Missing process sequence or custom process data");
  }

  const firstItem = pipeline[0];
  if (firstItem.type === "file") {
    if (!firstItem.fileName) {
      throw new Error("Missing fileName in pipeline item");
    }
    const filePath = join(getQuestionsDir(), firstItem.fileName);
    const fileContent = await readFile(filePath, "utf-8");
    sessionData = JSON.parse(fileContent);
  } else {
    if (!firstItem.customData) {
      throw new Error("Missing customData in custom pipeline item");
    }
    sessionData = firstItem.customData;
  }

  // Map session data to profile and tasks
  const profile: GraphProfile = {
    processName: sessionData.profile?.processName || sessionData.processName || sessionData.name || "Custom Process",
    allowFollowUps: sessionData.allowFollowUps !== undefined ? sessionData.allowFollowUps : true,
    allowDoubtConfirmation: sessionData.allowDoubtConfirmation !== undefined ? sessionData.allowDoubtConfirmation : true,
    allowKnowledgeConsultation: sessionData.allowKnowledgeConsultation !== undefined ? sessionData.allowKnowledgeConsultation : true,
    generateTaskSummaries: sessionData.generateTaskSummaries !== undefined ? sessionData.generateTaskSummaries : true,
    saveTaskSummariesToOutput: sessionData.saveTaskSummariesToOutput !== undefined ? sessionData.saveTaskSummariesToOutput : true,
    answerSufficiencyPrompt: sessionData.answerSufficiencyPrompt,
    systemPrompt: sessionData.systemPrompt,
    knowledgeBase: sessionData.knowledgeBase,
    hooks: sessionData.hooks || {},
    modelConfig: params.modelConfig,
  };

  const tasks = sessionData.tasks || [];

  // Initialize graph state
  const prefix = profile.processName ? `output_${profile.processName.toLowerCase().replace(/\s+/g, "_")}` : "output";
  const baseInitialState = createInitialState(profile, prefix);
  
  // Set up state with tasks and initial file outputs
  const initialState: GraphState = {
    ...baseInitialState,
    taskQueue: tasks,
  };

  // Generate the joint sequence name (e.g. "ALTUS / SIPAC / AHP" or single process name)
  let sequenceName = profile.processName || "Custom Process";
  if (pipeline.length > 0) {
    const names: string[] = [];
    for (const item of pipeline) {
      if (item.type === "file" && item.fileName) {
        const cleanName = item.fileName
          .replace("preguntas-", "")
          .replace(".json", "")
          .toUpperCase();
        names.push(cleanName);
      } else if (item.type === "custom" && item.customData) {
        names.push(item.customData.processName || item.customData.name || "Custom Process");
      }
    }
    if (names.length > 0) {
      sequenceName = names.join(" -> ");
    }
  }

  const sessionInfo: SessionInfo = {
    sessionId,
    processName: sequenceName,
    status: "running",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    questionsFile: firstItem.type === "file" ? firstItem.fileName : undefined,
    questionsFiles: pipeline,
    currentFileIndex: 0,
    profile,
    firstInterrupt: null,
  };

  // Cache in memory
  sessionsMap.set(sessionId, sessionInfo);

  // Persist initial session metadata to SQLite BEFORE graph invocation
  // to prevent FOREIGN KEY constraint failures in saveTrace callbacks
  try {
    saveSession({
      id: sessionId,
      process_name: sessionInfo.processName,
      status: "running",
      created_at: sessionInfo.createdAt,
      last_active_at: sessionInfo.lastActiveAt,
      questions_file: sessionInfo.questionsFile,
      profile: JSON.stringify(profile),
      first_interrupt: undefined,
      questions_files: JSON.stringify(pipeline),
      current_file_index: 0,
      carried_context_map: JSON.stringify({}),
      carried_output_json: JSON.stringify({})
    });
  } catch (err) {
    console.error("Failed to save initial session to SQLite:", err);
  }

  // Run the graph initial iteration to start tasks loading and first action
  const config = {
    recursionLimit: 100,
    configurable: { thread_id: sessionId },
    metadata: { session_id: sessionId },
    callbacks: [createTraceCallbacks(sessionId, onEvent)],
  };

  const graphState = await runWithSessionModel(profile, async () => {
    await appGraph.invoke(initialState, config);
    return await appGraph.getState(config);
  });

  const activeTasks = graphState.tasks;
  const currentInterrupt = activeTasks?.[0]?.interrupts?.[0];

  // Update session status and interrupts after invocation completes
  const interruptWithOutput = currentInterrupt ? {
    ...currentInterrupt.value,
    outputJson: (graphState.values as any)?.outputJson || {},
  } : null;

  sessionInfo.status = currentInterrupt ? "interrupted" : "completed";
  sessionInfo.firstInterrupt = interruptWithOutput;

  try {
    saveSession({
      id: sessionId,
      process_name: sessionInfo.processName,
      status: sessionInfo.status,
      created_at: sessionInfo.createdAt,
      last_active_at: new Date().toISOString(),
      questions_file: sessionInfo.questionsFile,
      profile: JSON.stringify(profile),
      first_interrupt: interruptWithOutput ? JSON.stringify(interruptWithOutput) : undefined,
      questions_files: JSON.stringify(pipeline),
      current_file_index: 0,
      carried_context_map: JSON.stringify({}),
      carried_output_json: JSON.stringify({})
    });
  } catch (err) {
    console.error("Failed to update session status in SQLite:", err);
  }

  if (!currentInterrupt) {
    return runWithSessionModel(profile, () =>
      handleProcessCompletion(sessionId, graphState, config, sessionInfo, onEvent)
    );
  }

  return sessionInfo;
}

/**
 * Resumes graph execution for a session by submitting the user answer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/**
 * Helper to handle process transition or completion.
 */
async function handleProcessCompletion(
  sessionId: string,
  graphState: any,
  config: any,
  session: SessionInfo,
  onEvent?: GraphEventCallback
): Promise<any> {
  const dbSession = getSessionFromDb(sessionId);
  const pipeline: ProcessDescriptor[] = dbSession?.questions_files ? JSON.parse(dbSession.questions_files) : [];
  let currentIndex = dbSession?.current_file_index !== undefined ? dbSession.current_file_index : 0;
  
  let carriedContextMap = dbSession?.carried_context_map ? JSON.parse(dbSession.carried_context_map) : {};
  let carriedOutputJson = dbSession?.carried_output_json ? JSON.parse(dbSession.carried_output_json) : {};

  if (currentIndex < pipeline.length - 1) {
    const finalState = graphState.values as GraphState;
    
    // Accumulate results
    carriedContextMap = { ...carriedContextMap, ...(finalState as any).contextMap };
    carriedOutputJson = { ...carriedOutputJson, ...finalState.outputJson };
    
    // Generate process summary
    try {
      const processName = session.profile?.processName || `Proceso_${currentIndex + 1}`;
      const processSummary = await generateProcessSummary(processName, finalState.taskSummaries || {});
      const previousSummary = carriedContextMap["previous_processes_summary"] || "";
      carriedContextMap["previous_processes_summary"] = previousSummary
        ? `${previousSummary}\n\n--- Resumen ${processName} ---\n${processSummary}`
        : `--- Resumen ${processName} ---\n${processSummary}`;
    } catch (e) {
      console.error("Failed to generate process summary:", e);
    }
    
    // Move to next process in pipeline
    currentIndex += 1;
    const nextItem = pipeline[currentIndex];
    let nextSessionData: any;
    let nextQuestionsFile: string | undefined = undefined;
    
    if (nextItem.type === "file") {
      if (!nextItem.fileName) throw new Error("Missing fileName in pipeline item");
      nextQuestionsFile = nextItem.fileName;
      const filePath = join(getQuestionsDir(), nextItem.fileName);
      const fileContent = await readFile(filePath, "utf-8");
      nextSessionData = JSON.parse(fileContent);
    } else {
      if (!nextItem.customData) throw new Error("Missing customData in custom pipeline item");
      nextSessionData = nextItem.customData;
    }
    
    const nextProfile: GraphProfile = {
      processName: nextSessionData.processName || nextSessionData.name || "Custom Process",
      allowFollowUps: nextSessionData.allowFollowUps !== undefined ? nextSessionData.allowFollowUps : true,
      allowDoubtConfirmation: nextSessionData.allowDoubtConfirmation !== undefined ? nextSessionData.allowDoubtConfirmation : true,
      allowKnowledgeConsultation: nextSessionData.allowKnowledgeConsultation !== undefined ? nextSessionData.allowKnowledgeConsultation : true,
      generateTaskSummaries: nextSessionData.generateTaskSummaries !== undefined ? nextSessionData.generateTaskSummaries : true,
      saveTaskSummariesToOutput: nextSessionData.saveTaskSummariesToOutput !== undefined ? nextSessionData.saveTaskSummariesToOutput : true,
      answerSufficiencyPrompt: nextSessionData.answerSufficiencyPrompt,
      systemPrompt: nextSessionData.systemPrompt,
      knowledgeBase: nextSessionData.knowledgeBase,
      hooks: nextSessionData.hooks || {},
      modelConfig: session.profile?.modelConfig,
    };
    const nextTasks = nextSessionData.tasks || [];
    
    const nextPrefix = nextProfile.processName ? `output_${nextProfile.processName.toLowerCase().replace(/\s+/g, "_")}` : "output";
    const baseInitialState = createInitialState(nextProfile, nextPrefix);
    
    const nextInitialState: GraphState = {
      ...baseInitialState,
      taskQueue: nextTasks,
      contextMap: { ...(baseInitialState as any).contextMap, ...carriedContextMap },
      outputJson: { ...baseInitialState.outputJson, ...carriedOutputJson },
    } as any as GraphState;
    
    session.status = "running";
    session.lastActiveAt = new Date().toISOString();
    session.questionsFile = nextQuestionsFile;
    session.profile = nextProfile;
    onEvent?.("process_transition", { nextProcessName: nextProfile.processName });
    
    saveSession({
      id: sessionId,
      process_name: session.processName,
      status: "running",
      created_at: session.createdAt,
      last_active_at: session.lastActiveAt,
      questions_file: nextQuestionsFile,
      profile: JSON.stringify(nextProfile),
      questions_files: JSON.stringify(pipeline),
      current_file_index: currentIndex,
      carried_context_map: JSON.stringify(carriedContextMap),
      carried_output_json: JSON.stringify(carriedOutputJson)
    });
    
    const nextGraphState = await runWithSessionModel(nextProfile, async () => {
      await appGraph.invoke(nextInitialState, config);
      return await appGraph.getState(config);
    });
    const nextActiveTasks = nextGraphState.tasks;
    const nextInterrupt = nextActiveTasks?.[0]?.interrupts?.[0];
    
    if (nextInterrupt) {
      const interruptPayload = {
        ...nextInterrupt.value,
        outputJson: (nextGraphState.values as any)?.outputJson || carriedOutputJson || {},
      };
      session.status = "interrupted";
      session.firstInterrupt = interruptPayload;
      
      saveSession({
        id: sessionId,
        process_name: session.processName,
        status: "interrupted",
        created_at: session.createdAt,
        last_active_at: session.lastActiveAt,
        questions_file: nextQuestionsFile,
        profile: JSON.stringify(nextProfile),
        first_interrupt: JSON.stringify(interruptPayload),
        questions_files: JSON.stringify(pipeline),
        current_file_index: currentIndex,
        carried_context_map: JSON.stringify(carriedContextMap),
        carried_output_json: JSON.stringify(carriedOutputJson)
      });
      
      return {
        status: "interrupted",
        sessionId,
        interrupt: interruptPayload,
        transitionedToNextProcess: true,
        nextProcessName: nextProfile.processName
      };
    } else {
      return runWithSessionModel(nextProfile, () =>
        handleProcessCompletion(sessionId, nextGraphState, config, session, onEvent)
      );
    }
  }

  // All processes in sequence are complete
  session.status = "completed";
  session.lastActiveAt = new Date().toISOString();

  try {
    saveSession({
      id: sessionId,
      process_name: session.processName,
      status: "completed",
      created_at: session.createdAt,
      last_active_at: session.lastActiveAt,
      questions_file: session.questionsFile,
      profile: JSON.stringify(session.profile || {}),
      first_interrupt: undefined,
      questions_files: JSON.stringify(pipeline),
      current_file_index: currentIndex,
      carried_context_map: JSON.stringify(carriedContextMap),
      carried_output_json: JSON.stringify(carriedOutputJson)
    });
  } catch (err) {
    console.error("Failed to update session status to completed in SQLite:", err);
  }

  const finalState = graphState.values as GraphState;
  
  // Persist result payload to SQLite results table
  try {
    saveResult({
      session_id: sessionId,
      output_json: JSON.stringify(carriedOutputJson || {}),
      task_summaries: JSON.stringify(finalState.taskSummaries || {}),
      output_file_name: finalState.outputFileName || `${sessionId}.json`,
      completed_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to save final results to SQLite:", err);
  }

  return {
    status: "completed",
    sessionId,
    results: enrichResultsWithMath(carriedOutputJson),
    taskSummaries: finalState.taskSummaries,
    outputFileName: finalState.outputFileName,
  };
}

export async function submitAnswer(sessionId: string, answer: string, onEvent?: GraphEventCallback): Promise<any> {
  let session = sessionsMap.get(sessionId);
  
  if (!session) {
    // Reload from SQLite if server restarted
    try {
      const dbSession = getSessionFromDb(sessionId);
      if (dbSession) {
        session = {
          sessionId: dbSession.id,
          processName: dbSession.process_name,
          status: dbSession.status as any,
          createdAt: dbSession.created_at,
          lastActiveAt: dbSession.last_active_at,
          questionsFile: dbSession.questions_file || undefined,
          questionsFiles: dbSession.questions_files ? JSON.parse(dbSession.questions_files) : undefined,
          currentFileIndex: dbSession.current_file_index !== undefined ? dbSession.current_file_index : 0,
          profile: dbSession.profile ? JSON.parse(dbSession.profile) : undefined,
          firstInterrupt: dbSession.first_interrupt ? JSON.parse(dbSession.first_interrupt) : undefined,
        };
        (session as any).carriedContextMap = dbSession.carried_context_map ? JSON.parse(dbSession.carried_context_map) : {};
        (session as any).carriedOutputJson = dbSession.carried_output_json ? JSON.parse(dbSession.carried_output_json) : {};
        sessionsMap.set(sessionId, session);
      }
    } catch (err) {
      console.error("Error reloading session from SQLite:", err);
    }
  }

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  session.status = "running";
  session.lastActiveAt = new Date().toISOString();
  
  const dbSession = getSessionFromDb(sessionId);
  try {
    saveSession({
      id: sessionId,
      process_name: session.processName,
      status: "running",
      created_at: session.createdAt,
      last_active_at: session.lastActiveAt,
      questions_file: session.questionsFile,
      profile: JSON.stringify(session.profile || {}),
      first_interrupt: JSON.stringify(session.firstInterrupt || null),
      questions_files: dbSession?.questions_files,
      current_file_index: dbSession?.current_file_index,
      carried_context_map: dbSession?.carried_context_map,
      carried_output_json: dbSession?.carried_output_json
    });
  } catch (err) {
    console.error("Failed to update session status to running in SQLite:", err);
  }

  const config = {
    recursionLimit: 100,
    configurable: { thread_id: sessionId },
    metadata: { session_id: sessionId },
    callbacks: [createTraceCallbacks(sessionId)],
  };

  // Resume the graph with the answer
  const graphState = await runWithSessionModel(session.profile, async () => {
    await appGraph.invoke(new Command({ resume: answer }), config);
    return await appGraph.getState(config);
  });
  const activeTasks = graphState.tasks;
  const currentInterrupt = activeTasks?.[0]?.interrupts?.[0];

  if (currentInterrupt) {
    // Session is interrupted waiting for further input
    const interruptPayload = {
      ...currentInterrupt.value,
      outputJson: (graphState.values as any)?.outputJson || (dbSession?.carried_output_json ? JSON.parse(dbSession.carried_output_json) : {}),
    };

    session.status = "interrupted";
    session.lastActiveAt = new Date().toISOString();
    session.firstInterrupt = interruptPayload;

    try {
      saveSession({
        id: sessionId,
        process_name: session.processName,
        status: "interrupted",
        created_at: session.createdAt,
        last_active_at: session.lastActiveAt,
        questions_file: session.questionsFile,
        profile: JSON.stringify(session.profile || {}),
        first_interrupt: JSON.stringify(interruptPayload),
        questions_files: dbSession?.questions_files,
        current_file_index: dbSession?.current_file_index,
        carried_context_map: dbSession?.carried_context_map,
        carried_output_json: dbSession?.carried_output_json
      });
    } catch (err) {
      console.error("Failed to update session status to interrupted in SQLite:", err);
    }

    return {
      status: "interrupted",
      sessionId,
      interrupt: interruptPayload,
    };
  }

  // No interrupts: the graph completed execution successfully
  return runWithSessionModel(session.profile, () =>
    handleProcessCompletion(sessionId, graphState, config, session, onEvent)
  );
}

/**
 * Gets the current state for a session, useful for initial load or UI checks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSessionState(sessionId: string): Promise<any> {
  let session = sessionsMap.get(sessionId);
  
  if (!session) {
    // Reload from SQLite if not in memory
    try {
      const dbSession = getSessionFromDb(sessionId);
      if (dbSession) {
        session = {
          sessionId: dbSession.id,
          processName: dbSession.process_name,
          status: dbSession.status as any,
          createdAt: dbSession.created_at,
          lastActiveAt: dbSession.last_active_at,
          questionsFile: dbSession.questions_file || undefined,
          questionsFiles: dbSession.questions_files ? JSON.parse(dbSession.questions_files) : undefined,
          currentFileIndex: dbSession.current_file_index !== undefined ? dbSession.current_file_index : 0,
          profile: dbSession.profile ? JSON.parse(dbSession.profile) : undefined,
          firstInterrupt: dbSession.first_interrupt ? JSON.parse(dbSession.first_interrupt) : undefined,
        };
        (session as any).carriedContextMap = dbSession.carried_context_map ? JSON.parse(dbSession.carried_context_map) : {};
        (session as any).carriedOutputJson = dbSession.carried_output_json ? JSON.parse(dbSession.carried_output_json) : {};
        sessionsMap.set(sessionId, session);
      }
    } catch (err) {
      console.error("Error reloading session state from SQLite:", err);
    }
  }

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const config = {
    configurable: { thread_id: sessionId },
  };

  const graphState = await appGraph.getState(config);
  const activeTasks = graphState.tasks;
  const currentInterrupt = activeTasks?.[0]?.interrupts?.[0];

  const dbSession = getSessionFromDb(sessionId);
  const interruptPayload = currentInterrupt ? {
    ...currentInterrupt.value,
    outputJson: (graphState.values as any)?.outputJson || (dbSession?.carried_output_json ? JSON.parse(dbSession.carried_output_json) : {}),
  } : null;

  return {
    ...session,
    interrupt: interruptPayload,
    values: graphState.values,
  };
}

/**
 * Lists all active and past in-memory and SQLite sessions.
 * Filters by allowedIds to ensure user session privacy.
 */
export function listSessions(allowedIds?: string[]): SessionInfo[] {
  // Clean up sessions inactive for more than 14 days
  try {
    deleteExpiredSessions(14);
  } catch (err) {
    console.error("Failed to run automatic session expiration cleanup:", err);
  }

  try {
    const dbSessions = listSessionsFromDb().filter(s => 
      (allowedIds && allowedIds.includes(s.id)) || s.id.startsWith("demo-")
    );
    return dbSessions.map(s => ({
      sessionId: s.id,
      processName: s.process_name,
      status: s.status as any,
      createdAt: s.created_at,
      lastActiveAt: s.last_active_at,
      questionsFile: s.questions_file || undefined,
      profile: s.profile ? JSON.parse(s.profile) : undefined,
      firstInterrupt: s.first_interrupt ? JSON.parse(s.first_interrupt) : undefined
    }));
  } catch (err) {
    console.error("Failed to list sessions from SQLite:", err);
    return Array.from(sessionsMap.values())
      .filter(s => (allowedIds && allowedIds.includes(s.sessionId)) || s.sessionId.startsWith("demo-"))
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
  }
}

/**
 * Lists all completed session output files written to results directory or stored in SQLite.
 * Filters by allowedIds to ensure user session privacy, always including demo sessions.
 */
export async function listPastResults(allowedIds?: string[]): Promise<Array<{ id: string; fileName: string; size: number; mtime: string }>> {
  // Query results from SQLite first for fast retrieval
  try {
    const dbSessions = listSessionsFromDb().filter(s => 
      s.status === "completed" && ((allowedIds && allowedIds.includes(s.id)) || s.id.startsWith("demo-"))
    );
    const resultsList: Array<{ id: string; fileName: string; size: number; mtime: string }> = [];
    
    for (const s of dbSessions) {
      const dbResult = getResultFromDb(s.id);
      if (dbResult) {
        resultsList.push({
          id: s.id,
          fileName: dbResult.output_file_name,
          size: Buffer.byteLength(dbResult.output_json),
          mtime: dbResult.completed_at
        });
      }
    }
    
    if (resultsList.length > 0) {
      return resultsList;
    }
  } catch (err) {
    console.error("Failed to list past results from SQLite:", err);
  }

  // Fallback to filesystem
  const dir = getResultsDir();
  if (!existsSync(dir)) {
    return [];
  }
  
  const files = await readdir(dir);
  const jsonFiles = files.filter(f => {
    const id = f.replace(".json", "");
    return f.endsWith(".json") && ((allowedIds && allowedIds.includes(id)) || id.startsWith("demo-"));
  });
  
  const list = [];
  for (const file of jsonFiles) {
    try {
      const fullPath = join(dir, file);
      const statResult = await stat(fullPath);
      list.push({
        id: file.replace(".json", ""),
        fileName: file,
        size: statResult.size,
        mtime: statResult.mtime.toISOString(),
      });
    } catch {}
  }
  
  return list.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

/**
 * Reads a results file by filename or session ID.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getResultContent(fileName: string): Promise<any> {
  // Try reading from SQLite database first
  try {
    const sessionId = fileName.replace(".json", "");
    const dbSessions = listSessionsFromDb();
    const session = dbSessions.find(s => s.id === sessionId || s.questions_file === fileName || s.process_name === fileName.replace(".json", ""));
    if (session) {
      const dbResult = getResultFromDb(session.id);
      if (dbResult) {
        return {
          outputJson: enrichResultsWithMath(JSON.parse(dbResult.output_json)),
          taskSummaries: JSON.parse(dbResult.task_summaries)
        };
      }
    }
  } catch (err) {
    console.error("Failed to read result content from SQLite:", err);
  }

  // Fallback to reading JSON file from disk
  const cleanName = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
  const filePath = join(getResultsDir(), cleanName);
  
  if (!existsSync(filePath)) {
    // Try in core/results as a backup
    const backupPath = resolve(process.cwd(), "../core/results", cleanName);
    if (existsSync(backupPath)) {
      const content = await readFile(backupPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.outputJson) {
        parsed.outputJson = enrichResultsWithMath(parsed.outputJson);
        return parsed;
      }
      return enrichResultsWithMath(parsed);
    }
    throw new Error(`Results file ${cleanName} not found`);
  }
  
  const content = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(content);
  if (parsed.outputJson) {
    parsed.outputJson = enrichResultsWithMath(parsed.outputJson);
    return parsed;
  }
  return enrichResultsWithMath(parsed);
}

/**
 * Runs mathematical models (ALTUS, SIPAC, AHP) on raw session results on the backend
 * and attaches processed outputs to the JSON object before serving it.
 */
export function enrichResultsWithMath(rawData: any): any {
  if (!rawData) return rawData;

  const result = { ...rawData };

  // 1. Process ALTUS scores
  try {
    const altusCapacidades: any[] = [];
    Object.entries(rawData).forEach(([key, val]: any) => {
      if (val && (val.puntuacion !== undefined || val.score !== undefined || val.qualification !== undefined || val.calificacion !== undefined)) {
        const score = val.puntuacion !== undefined ? val.puntuacion :
                      val.score !== undefined ? val.score :
                      val.qualification !== undefined ? val.qualification :
                      val.calificacion;
        const cleanKey = key.replace(/^record:/, '');
        altusCapacidades.push({ key: cleanKey, score });
      }
    });

    if (altusCapacidades.length > 0) {
      result.altus_processed = calcAltusScores(altusCapacidades);
    }
  } catch (err) {
    console.error("Backend ALTUS processing failed:", err);
  }

  // 2. Process SIPAC scores
  try {
    const extractProcsList = (): any[] => {
      const candidates = [
        rawData.sipac_final_output,
        rawData.activos_artefactos_final,
        rawData.activos_confirmados_importancia,
        rawData.activos_propuestos,
        rawData.activos_ci_artefactos,
        rawData.sipac_pre_final_output
      ];
      for (const cand of candidates) {
        if (!cand) continue;
        if (Array.isArray(cand)) return cand;
        if (cand.Procesos && Array.isArray(cand.Procesos)) return cand.Procesos;
        if (cand.procesos && Array.isArray(cand.procesos)) return cand.procesos;
      }
      return [];
    };

    const processes = extractProcsList();
    const sipacResults: any[] = [];

    processes.forEach((procObj: any) => {
      const subProcs = procObj.procesos || procObj.Procesos || [procObj];
      subProcs.forEach((proc: any) => {
        const assets = proc.Activos || proc.activos || [];
        assets.forEach((asset: any) => {
          const artifacts = asset.artefactos || asset.artefactos_propuestos || [];
          artifacts.forEach((art: any) => {
            const artName = typeof art === "string" ? art : art.artefacto || art.artefo || art.name || "Artefacto";
            const inds = (art.indicadores || [])
              .filter((i: any) => typeof i.actual === 'number' && typeof i.meta === 'number')
              .map((i: any) => ({
                nombre: i.nombre,
                tipo: i.tipo,
                minimo: i.minimo,
                maximo: i.maximo,
                sentido: i.sentido,
                actual: i.actual,
                meta: i.meta,
              }));

            if (inds.length > 0) {
              const scoreResult = calcSipacScores(inds);
              const quadrant = classifySipacQuadrant(scoreResult.V_calidad, scoreResult.W_impacto);
              sipacResults.push({
                activo: asset.activo_especifico || "Activo",
                artefacto: artName,
                V: scoreResult.V_calidad,
                W: scoreResult.W_impacto,
                X: scoreResult.X_final,
                quadrant
              });
            }
          });
        });
      });
    });

    if (sipacResults.length > 0) {
      result.sipac_processed = sipacResults;
    }
  } catch (err) {
    console.error("Backend SIPAC processing failed:", err);
  }

  // 3. Process AHP scores
  try {
    const criteriaKeys: string[] = rawData.ahp_final_criteria?.criterios_finales || [];
    const critComps = rawData.ahp_criteria_comparisons?.comparaciones_criterios || [];
    const altData = rawData.ahp_alternatives_comparisons?.matrices_alternativas || [];

    if (criteriaKeys.length > 0 && critComps.length > 0) {
      const buildAhpMatrix = (items: string[], comparisons: any[]): number[][] => {
        const n = items.length;
        const matrix = Array.from({ length: n }, () => new Array(n).fill(1));
        for (const comp of comparisons) {
          const idxA = items.findIndex((i) => i.toLowerCase().trim() === comp.item_a.toLowerCase().trim());
          const idxB = items.findIndex((i) => i.toLowerCase().trim() === comp.item_b.toLowerCase().trim());
          if (idxA === -1 || idxB === -1 || idxA === idxB) continue;

          let scoreA = 1;
          let scoreB = 1;
          const ganador = String(comp.ganador || "").toLowerCase().trim();
          const itemAStr = comp.item_a.toLowerCase().trim();
          const itemBStr = comp.item_b.toLowerCase().trim();

          if (ganador === "empate") {
            scoreA = 1;
            scoreB = 1;
          } else if (ganador === itemAStr || ganador.includes(itemAStr)) {
            scoreA = Number(comp.peso_saaty) || 1;
            scoreB = 1 / scoreA;
          } else if (ganador === itemBStr || ganador.includes(itemBStr)) {
            scoreB = Number(comp.peso_saaty) || 1;
            scoreA = 1 / scoreB;
          }
          matrix[idxA][idxB] = scoreA;
          matrix[idxB][idxA] = scoreB;
        }
        return matrix;
      };

      const critMatrix = buildAhpMatrix(criteriaKeys, critComps);
      const critRes = calcAhp(critMatrix);

      // Extract unique alternatives (artifacts)
      const artifactsSet = new Set<string>();
      altData.forEach((alt: any) => {
        alt.comparaciones?.forEach((comp: any) => {
          if (comp.item_a) artifactsSet.add(comp.item_a);
          if (comp.item_b) artifactsSet.add(comp.item_b);
        });
      });
      const artifacts = Array.from(artifactsSet);

      const altWeightsPerCriteria: number[][] = [];
      for (let i = 0; i < criteriaKeys.length; i++) {
        const critName = criteriaKeys[i];
        const altItem = altData.find((a: any) => 
          a.criterio.toLowerCase().trim() === critName.toLowerCase().trim() || 
          critName.toLowerCase().includes(a.criterio.toLowerCase().trim())
        );

        if (altItem && altItem.comparaciones && altItem.comparaciones.length > 0) {
          const altMatrix = buildAhpMatrix(artifacts, altItem.comparaciones);
          const altRes = calcAhp(altMatrix);
          altWeightsPerCriteria.push(altRes.weights);
        } else {
          altWeightsPerCriteria.push(new Array(artifacts.length).fill(1 / artifacts.length));
        }
      }

      // Calculate final scores
      const scores = artifacts.map((art, artIdx) => {
        let score = 0;
        for (let critIdx = 0; critIdx < criteriaKeys.length; critIdx++) {
          score += (critRes.weights[critIdx] || 0) * (altWeightsPerCriteria[critIdx]?.[artIdx] || 0);
        }
        return { name: art, score };
      });

      scores.sort((a, b) => b.score - a.score);

      result.ahp_processed = {
        criteriaResult: critRes,
        altWeightsPerCriteria,
        artifacts,
        scores
      };
    }
  } catch (err) {
    console.error("Backend AHP processing failed:", err);
  }

  return result;
}
