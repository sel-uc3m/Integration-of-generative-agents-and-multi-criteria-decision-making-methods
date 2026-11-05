import { StateGraph, END, START, Annotation, MemorySaver } from "@langchain/langgraph";
import { Task, Action, GraphState, GraphProfile } from "./types.js";
import {
  taskLoader,
  extractAction,
  questionManager,
  doubtConfirmer,
  knowledgeConsultant,
  contextProcessor,
  architect,
  executeInternalAction,
  actionAnswerSummarizer,
  executeActionHook,
  executeTaskHook,
  saveToOutput,
  taskSummarizer,
} from "./nodes/index.js";
import {
  checkTaskQueue,
  checkActionQueue,
  determineActionType,
  router,
  checkArchitectDecision,
} from "./conditions.js";

// Define how the graph should update its state based on the outputs of each node
// And define the default values for the initial state
const GraphAnnotation = Annotation.Root({
  taskQueue: Annotation<Task[]>({
    reducer: (a, b) => b ?? a,
    default: () => [],
  }),
  actionQueue: Annotation<Action[]>({
    reducer: (a, b) => b ?? a,
    default: () => [],
  }),
  currentTask: Annotation<Task | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  currentAction: Annotation<Action | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  outputJson: Annotation<Record<string, unknown>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  outputFileName: Annotation<string>({
    reducer: (a, b) => b ?? a,
    default: () => "",
  }),
  taskSummaries: Annotation<Record<string, string>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  contextMap: Annotation<Record<string, string>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  isComplete: Annotation<boolean>({
    reducer: (a, b) => b ?? a,
    default: () => false,
  }),
  profile: Annotation<GraphProfile>({
    reducer: (a, b) => b ?? a,
    default: () => ({
      allowFollowUps: false,
      allowDoubtConfirmation: false,
      allowKnowledgeConsultation: false,
      generateTaskSummaries: false,
      saveTaskSummariesToOutput: false,
      hooks: {},
    }),
  }),
});

function createSessionOutputFileName(prefix: string = "output"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}_${timestamp}.json`;
}

function createInitialState(profile: GraphProfile, prefix: string = "output"): GraphState {
  const outputFileName = createSessionOutputFileName(prefix);

  return {
    taskQueue: [],
    actionQueue: [],
    currentTask: null,
    currentAction: null,
    outputJson: {},
    outputFileName,
    taskSummaries: {},
    contextMap: {},
    isComplete: false,
    profile,
  };
}

function createGraph(_profile: GraphProfile) {
  const graph = new StateGraph(GraphAnnotation)
    .addNode("taskLoader", taskLoader)
    .addNode("extractAction", extractAction)
    .addNode("questionManager", questionManager)
    .addNode("doubtConfirmer", doubtConfirmer)
    .addNode("knowledgeConsultant", knowledgeConsultant)
    .addNode("contextProcessor", contextProcessor)
    .addNode("architect", architect)
    .addNode("executeInternalAction", executeInternalAction)
    .addNode("actionAnswerSummarizer", actionAnswerSummarizer)
    .addNode("executeActionHook", executeActionHook)
    .addNode("executeTaskHook", executeTaskHook)
    .addNode("saveToOutput", saveToOutput)
    .addNode("taskSummarizer", taskSummarizer);

  graph.addEdge(START, "taskLoader");

  graph.addConditionalEdges("taskLoader", checkTaskQueue, {
    empty: END,
    hasTask: "extractAction",
  });

  graph.addConditionalEdges("extractAction", determineActionType, {
    question: "questionManager",
    internal: "executeInternalAction",
    loop_validation: "extractAction",
  });

  graph.addConditionalEdges("questionManager", router, {
    doubt: "knowledgeConsultant",
    confirm_doubt: "doubtConfirmer",
    response: "contextProcessor",
  });

  graph.addConditionalEdges("doubtConfirmer", router, {
    doubt: "knowledgeConsultant",
    response: "contextProcessor",
  });

  graph.addEdge("knowledgeConsultant", "questionManager");

  graph.addEdge("contextProcessor", "architect");

  graph.addConditionalEdges("architect", checkArchitectDecision, {
    stop: "actionAnswerSummarizer",
    ask_follow_up: "questionManager",
  });

  graph.addEdge("executeInternalAction", "actionAnswerSummarizer");

  graph.addEdge("actionAnswerSummarizer", "executeActionHook");

  graph.addEdge("executeActionHook", "saveToOutput");

  graph.addConditionalEdges("saveToOutput", checkActionQueue, {
    empty: "taskSummarizer",
    hasAction: "extractAction",
  });

  graph.addEdge("taskSummarizer", "executeTaskHook");

  graph.addEdge("executeTaskHook", "taskLoader");

  const checkpointer = process.env.TFM_WEB === "true" ? new MemorySaver() : undefined;
  return graph.compile(checkpointer ? { checkpointer } : undefined);
}

export { createGraph, createInitialState };
