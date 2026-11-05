import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

const nodeFns = {
    taskLoader: vi.fn(async () => ({})),
    extractAction: vi.fn(async () => ({})),
    questionManager: vi.fn(async () => ({})),
    doubtConfirmer: vi.fn(async () => ({})),
    knowledgeConsultant: vi.fn(async () => ({})),
    contextProcessor: vi.fn(async () => ({})),
    architect: vi.fn(async () => ({})),
    executeInternalAction: vi.fn(async () => ({})),
    actionAnswerSummarizer: vi.fn(async () => ({})),
    executeActionHook: vi.fn(async () => ({})),
    executeTaskHook: vi.fn(async () => ({})),
    saveToOutput: vi.fn(async () => ({})),
    taskSummarizer: vi.fn(async () => ({})),
};

const conditionFns = {
    checkTaskQueue: vi.fn(),
    checkActionQueue: vi.fn(),
    determineActionType: vi.fn(),
    router: vi.fn(),
    checkArchitectDecision: vi.fn(),
};

vi.mock("../../../src/nodes/index.js", () => nodeFns);
vi.mock("../../../src/conditions.js", () => conditionFns);

const { createGraph, createInitialState } = await import("../../../src/graph.js");

const mockProfile = {
    allowFollowUps: true,
    allowDoubtConfirmation: true,
    allowKnowledgeConsultation: true,
    generateTaskSummaries: true,
    saveTaskSummariesToOutput: true,
    hooks: {}
};

describe("graph", () => {
    beforeEach(() => {
        for (const fn of Object.values(nodeFns)) {
            fn.mockClear();
        }
        for (const fn of Object.values(conditionFns)) {
            fn.mockReset();
        }
    });

    it("creates the default initial state", () => {
        const state = createInitialState(mockProfile);

        expect(state).toMatchObject({
            taskQueue: [],
            actionQueue: [],
            currentTask: null,
            currentAction: null,
            outputJson: {},
            taskSummaries: {},
            isComplete: false,
            profile: mockProfile,
        });
        expect(state.outputFileName).toMatch(/^output_.*\.json$/);
    });

    it("routes a question flow through the expected nodes", async () => {
        conditionFns.checkTaskQueue
            .mockResolvedValueOnce("hasTask")
            .mockResolvedValueOnce("empty");
        conditionFns.determineActionType.mockResolvedValueOnce("question");
        conditionFns.router.mockResolvedValueOnce("response");
        conditionFns.checkArchitectDecision.mockResolvedValueOnce("stop");
        conditionFns.checkActionQueue.mockResolvedValueOnce("empty");

        const graph = createGraph(mockProfile);
        const state = buildState();
        state.profile = mockProfile;
        await graph.invoke(state);

        expect(nodeFns.taskLoader).toHaveBeenCalledTimes(2);
        expect(nodeFns.extractAction).toHaveBeenCalledTimes(1);
        expect(nodeFns.questionManager).toHaveBeenCalledTimes(1);
        expect(nodeFns.doubtConfirmer).not.toHaveBeenCalled();
        expect(nodeFns.contextProcessor).toHaveBeenCalledTimes(1);
        expect(nodeFns.architect).toHaveBeenCalledTimes(1);
        expect(nodeFns.actionAnswerSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeActionHook).toHaveBeenCalledTimes(1);
        expect(nodeFns.saveToOutput).toHaveBeenCalledTimes(1);
        expect(nodeFns.taskSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeTaskHook).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeInternalAction).not.toHaveBeenCalled();
        expect(nodeFns.knowledgeConsultant).not.toHaveBeenCalled();
    });

    it("routes ambiguous doubts through the confirmation node before continuing as a response", async () => {
        conditionFns.checkTaskQueue
            .mockResolvedValueOnce("hasTask")
            .mockResolvedValueOnce("empty");
        conditionFns.determineActionType.mockResolvedValueOnce("question");
        conditionFns.router
            .mockResolvedValueOnce("confirm_doubt")
            .mockResolvedValueOnce("response");
        conditionFns.checkArchitectDecision.mockResolvedValueOnce("stop");
        conditionFns.checkActionQueue.mockResolvedValueOnce("empty");

        const graph = createGraph(mockProfile);
        const state = buildState();
        state.profile = mockProfile;
        await graph.invoke(state);

        expect(nodeFns.extractAction).toHaveBeenCalledTimes(1);
        expect(nodeFns.questionManager).toHaveBeenCalledTimes(1);
        expect(nodeFns.doubtConfirmer).toHaveBeenCalledTimes(1);
        expect(nodeFns.knowledgeConsultant).not.toHaveBeenCalled();
        expect(nodeFns.contextProcessor).toHaveBeenCalledTimes(1);
        expect(nodeFns.architect).toHaveBeenCalledTimes(1);
        expect(nodeFns.actionAnswerSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeActionHook).toHaveBeenCalledTimes(1);
        expect(nodeFns.saveToOutput).toHaveBeenCalledTimes(1);
        expect(nodeFns.taskSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeTaskHook).toHaveBeenCalledTimes(1);
    });

    it("routes insufficient answers that need follow-up through architect and back to question manager before stopping", async () => {
        conditionFns.checkTaskQueue
            .mockResolvedValueOnce("hasTask")
            .mockResolvedValueOnce("empty");
        conditionFns.determineActionType.mockResolvedValueOnce("question");
        conditionFns.router
            .mockResolvedValueOnce("response")
            .mockResolvedValueOnce("response");
        conditionFns.checkArchitectDecision
            .mockResolvedValueOnce("ask_follow_up")
            .mockResolvedValueOnce("stop");
        conditionFns.checkActionQueue.mockResolvedValueOnce("empty");

        const graph = createGraph(mockProfile);
        const state = buildState();
        state.profile = mockProfile;
        await graph.invoke(state);

        expect(nodeFns.extractAction).toHaveBeenCalledTimes(1);
        expect(nodeFns.questionManager).toHaveBeenCalledTimes(2);
        expect(nodeFns.doubtConfirmer).not.toHaveBeenCalled();
        expect(nodeFns.contextProcessor).toHaveBeenCalledTimes(2);
        expect(nodeFns.architect).toHaveBeenCalledTimes(2);
        expect(nodeFns.actionAnswerSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeActionHook).toHaveBeenCalledTimes(1);
        expect(nodeFns.saveToOutput).toHaveBeenCalledTimes(1);
        expect(nodeFns.taskSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeTaskHook).toHaveBeenCalledTimes(1);
    });

    it("routes internal actions directly to execution", async () => {
        conditionFns.checkTaskQueue
            .mockResolvedValueOnce("hasTask")
            .mockResolvedValueOnce("empty");
        conditionFns.determineActionType.mockResolvedValueOnce("internal");
        conditionFns.checkActionQueue.mockResolvedValueOnce("empty");

        const graph = createGraph(mockProfile);
        const state = buildState();
        state.profile = mockProfile;
        await graph.invoke(state);

        expect(nodeFns.extractAction).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeInternalAction).toHaveBeenCalledTimes(1);
        expect(nodeFns.actionAnswerSummarizer).toHaveBeenCalledTimes(1);
        expect(nodeFns.executeActionHook).toHaveBeenCalledTimes(1);
        expect(nodeFns.saveToOutput).toHaveBeenCalledTimes(1);
        expect(nodeFns.questionManager).not.toHaveBeenCalled();
        expect(nodeFns.doubtConfirmer).not.toHaveBeenCalled();
        expect(conditionFns.router).not.toHaveBeenCalled();
        expect(conditionFns.checkArchitectDecision).not.toHaveBeenCalled();
    });
});
