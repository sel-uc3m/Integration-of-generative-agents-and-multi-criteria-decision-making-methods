import { GraphState, Task, GraphProfile } from "../../src/types.js";

const defaultProfile: GraphProfile = {
    allowFollowUps: true,
    allowDoubtConfirmation: true,
    allowKnowledgeConsultation: true,
    generateTaskSummaries: true,
    saveTaskSummariesToOutput: true,
    hooks: {}
};

export function buildState(overrides: Partial<GraphState> = {}): GraphState {
    return {
        taskQueue: [],
        actionQueue: [],
        currentTask: null,
        currentAction: null,
        outputJson: {},
        outputFileName: "test-output.json",
        taskSummaries: {},
        isComplete: false,
        profile: defaultProfile,
        ...overrides,
    };
}

export function buildStateFromTasks(
    tasks: Task[],
    overrides: Partial<GraphState> = {},
): GraphState {
    return buildState({ taskQueue: tasks, ...overrides });
}
