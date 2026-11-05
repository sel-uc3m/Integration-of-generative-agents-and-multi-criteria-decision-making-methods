export type VerbosityMode = "concise" | "verbose";

export interface GraphHook {
  /** LLM instruction to execute. Can refer to variables like {outputVar} */
  instruction: string;
  /** Variable key to store the result under (within outputJson) */
  outputVar?: string;
  /** Schema for structured output validation */
  outputSchema?: Record<string, any>;
}

export interface GraphProfile {
  processName?: string;
  allowFollowUps: boolean;
  allowDoubtConfirmation: boolean;
  allowKnowledgeConsultation: boolean;
  generateTaskSummaries: boolean;
  saveTaskSummariesToOutput: boolean;
  answerSufficiencyPrompt?: string;
  systemPrompt?: string;
  knowledgeBase?: Array<{ name: string; path: string }>;
  hooks: {
    afterActionAnswer?: GraphHook;
    afterTask?: GraphHook;
  };
  modelConfig?: Record<string, string>;
}

export interface TranscriptMessage {
  role: "system" | "assistant" | "user";
  type: "question" | "clarification" | "answer" | "doubt";
  content: string;
}

/**
 * Represents a single operation within a task.
 */
export interface Action {
  id: string;
  /** Defines if the action is a user-facing question, a system operation, or a dynamic loop */
  type: ActionType;
  /** The text or command to be processed */
  content: string;
  /** For internal actions: specific instructions for the LLM */
  instruction?: string;
  /** For loop actions: the key in outputJson containing the array to iterate over */
  sourceVar?: string;
  /** For loop actions: defines what type of action to unroll into (defaults to "question") */
  unrollType?: ActionType;
  /** For loop actions: template for generating dynamic questions */
  templateQuestion?: string;
  /** For loop actions: template for generating dynamic internal instructions */
  templateInstruction?: string;
  /** For internal actions: where to save the reasoning result in outputJson */
  outputVar?: string;
  /** For loop actions: where to save each item's result within the loop context */
  outputVarItem?: string;
  /** JSON Schema to enforce structured output for the LLM */
  outputSchema?: Record<string, any>;
  /** For unrolled actions: keeps track of the original item and index */
  loopMetadata?: {
    originalActionId: string;
    itemIndex: number;
    sourceVar: string;
  };
  /** History of events for this specific action */
  transcript?: TranscriptMessage[];
  completeAnswer?: string;
  summary?: string;
  /** Final processed response or outcome */
  result?: string;
  doubtExplanation?: string;
  doubtConfirmed?: boolean;
  followUpPrompt?: string;
  followUpQuestion?: string;
  nextStep?: AnswerEvaluationNextStep;
  hookResults?: Record<string, any>;
}

export interface ActionQualification {
  qualification: number;
  reasoning: string;
}

/**
 * A collection of actions grouped under a specific assessment goal.
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Descriptive name of the assessment task */
  name: string;
  /** Free-form metadata for task segmentation */
  metadata?: Record<string, any>;
  /** List of actions to be executed sequentially */
  actions: Action[];
}

/**
 * The global state maintained throughout the graph execution.
 */
export type GraphState = {
  /** Queue of tasks remaining to be processed */
  taskQueue: Task[];
  /** Queue of actions remaining for the current task */
  actionQueue: Action[];
  /** The task currently being executed */
  currentTask: Task | null;
  /** The specific action currently being processed */
  currentAction: Action | null;
  /** Final structured results of the assessment */
  outputJson: Record<string, unknown>;
  outputFileName: string;
  taskSummaries: Record<string, string>;
  /** Carried contextual summaries across process sessions */
  contextMap?: Record<string, string>;
  /** Flag indicating if the entire process has finished */
  isComplete: boolean;
  /** Configuration profile for the session */
  profile: GraphProfile;
};

/**
 * Represents a partial update to the GraphState returned by nodes.
 */
export type NodeResult = Partial<GraphState>;

/**
 * Available action categories.
 */
export type ActionType = "question" | "internal" | "loop_validation";

/**
 * Possible routing paths after evaluating a user response.
 */
export type RouterDecision = "doubt" | "confirm_doubt" | "response";

/**
 * Intent detected in a user utterance.
 */
export type ResponseIntent = "doubt" | "response";

export interface ResponseClassification {
  intent: ResponseIntent;
  confidence: number;
}

/**
 * Evaluation of whether an answer provides enough information.
 */
export type AnswerEvaluationVerdict = "sufficient" | "insufficient";

export type AnswerEvaluationNextStep = "stop" | "ask_follow_up";

export interface AnswerEvaluation {
  verdict: AnswerEvaluationVerdict;
  confidence: number;
  nextStep: AnswerEvaluationNextStep;
}

/**
 * One scripted entry: maps an actionId to the response to give.
 * Multiple entries with the same actionId are consumed in order
 * (useful when the graph asks the same action more than once).
 */
export interface ScriptedEntry {
  actionId: string;
  source?: string;
  taskId?: string;
  questionIndex?: number;
  response: string;
}
