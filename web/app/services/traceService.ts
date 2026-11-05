import { appGraph } from "./graphService";
import { saveTrace, getTraceFromDb } from "./dbService";

export interface LLMCall {
  id: string;
  model: string;
  prompts: string[];
  response?: string;
  timestamp: string;
  durationMs?: number;
  node?: string | null;
}

export interface NodeVisit {
  node: string;
  timestamp: string;
}

export interface NodeRun {
  runId: string;
  node: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputs?: any;
  timestamp: string;
  durationMs?: number;
}

export interface SessionTrace {
  sessionId: string;
  activeNode: string | null;
  nodeHistory: NodeVisit[];
  llmCalls: LLMCall[];
  nodeRuns: NodeRun[];
}

// In-memory trace store acting as a fast cache
const traceStore = new Map<string, SessionTrace>();

/**
 * Persists trace state to SQLite database
 */
function persistTraceToDb(trace: SessionTrace) {
  try {
    saveTrace({
      session_id: trace.sessionId,
      active_node: trace.activeNode,
      node_history: JSON.stringify(trace.nodeHistory),
      llm_calls: JSON.stringify(trace.llmCalls),
      node_runs: JSON.stringify(trace.nodeRuns),
    });
  } catch (err) {
    console.error("Failed to persist trace to SQLite:", err);
  }
}

/**
 * Initializes or gets trace for a session
 */
export function getOrCreateTrace(sessionId: string): SessionTrace {
  let trace = traceStore.get(sessionId);
  if (!trace || trace.nodeRuns.length === 0) {
    // Try to load from SQLite first to persist across server restarts and picks up seeded runs
    try {
      const dbTrace = getTraceFromDb(sessionId);
      if (dbTrace) {
        const history = JSON.parse(dbTrace.node_history || "[]");
        const runs = JSON.parse(dbTrace.node_runs || "[]");
        const calls = JSON.parse(dbTrace.llm_calls || "[]");
        if (runs.length > 0 || !trace) {
          trace = {
            sessionId,
            activeNode: dbTrace.active_node,
            nodeHistory: history,
            llmCalls: calls,
            nodeRuns: runs,
          };
          traceStore.set(sessionId, trace);
          return trace;
        }
      }
    } catch (err) {
      console.error("Error loading trace from SQLite:", err);
    }
  }

  if (!trace) {
    trace = {
      sessionId,
      activeNode: null,
      nodeHistory: [],
      llmCalls: [],
      nodeRuns: [],
    };
    traceStore.set(sessionId, trace);
  }
  return trace;
}

/**
 * Updates the active node in trace
 */
export function updateActiveNode(sessionId: string, node: string) {
  const trace = getOrCreateTrace(sessionId);
  trace.activeNode = node;
  
  // Only add if different from the last visited node or if history is empty
  const lastVisit = trace.nodeHistory[trace.nodeHistory.length - 1];
  if (!lastVisit || lastVisit.node !== node) {
    trace.nodeHistory.push({
      node,
      timestamp: new Date().toISOString(),
    });
  }
  persistTraceToDb(trace);
}

/**
 * Logs the start of a node execution
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logNodeStart(sessionId: string, runId: string, node: string, inputs: any) {
  // Only log if inputs resemble a LangGraph state to filter out sub-runnables
  const isGraphState = inputs && (
    inputs.taskQueue !== undefined || 
    inputs.actionQueue !== undefined || 
    inputs.outputJson !== undefined ||
    inputs.profile !== undefined
  );
  if (!isGraphState) return;

  const trace = getOrCreateTrace(sessionId);

  const taskId = inputs.currentTask?.id;
  const actionId = inputs.currentAction?.id;
  const transcriptLength = (inputs.currentAction?.transcript || []).length;

  // Find if we already have a run logged for this exact logical step (avoid duplicate boxes on resume/retry)
  const existingRunIndex = trace.nodeRuns.findIndex(r => {
    if (r.node !== node) return false;
    
    if (!actionId) {
      return r.inputs?.currentTask?.id === taskId;
    }
    
    return (
      r.inputs?.currentTask?.id === taskId &&
      r.inputs?.currentAction?.id === actionId &&
      (r.inputs?.currentAction?.transcript || []).length === transcriptLength
    );
  });

  if (existingRunIndex !== -1) {
    // Update existing logical run with new runId and inputs
    trace.nodeRuns[existingRunIndex] = {
      runId,
      node,
      inputs,
      timestamp: new Date().toISOString(),
    };
  } else {
    // Add new run
    trace.nodeRuns.push({
      runId,
      node,
      inputs,
      timestamp: new Date().toISOString(),
    });
  }
  persistTraceToDb(trace);
}

/**
 * Logs the completion of a node execution
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logNodeEnd(sessionId: string, runId: string, outputs: any) {
  const trace = getOrCreateTrace(sessionId);
  const run = trace.nodeRuns.find(r => r.runId === runId);
  if (run) {
    run.outputs = outputs;
    const start = new Date(run.timestamp).getTime();
    const end = Date.now();
    run.durationMs = end - start;
    persistTraceToDb(trace);
  }
}

/**
 * Logs the start of an LLM call
 */
export function logLLMStart(sessionId: string, runId: string, model: string, prompts: string[]) {
  const trace = getOrCreateTrace(sessionId);
  const exists = trace.llmCalls.some(call => call.id === runId);
  if (!exists) {
    trace.llmCalls.push({
      id: runId,
      model,
      prompts,
      timestamp: new Date().toISOString(),
      node: trace.activeNode,
    });
    persistTraceToDb(trace);
  }
}

/**
 * Logs the completion of an LLM call
 */
export function logLLMEnd(sessionId: string, runId: string, response: string) {
  const trace = getOrCreateTrace(sessionId);
  const call = trace.llmCalls.find(c => c.id === runId);
  if (call) {
    call.response = response;
    const start = new Date(call.timestamp).getTime();
    const end = Date.now();
    call.durationMs = end - start;
    persistTraceToDb(trace);
  }
}
