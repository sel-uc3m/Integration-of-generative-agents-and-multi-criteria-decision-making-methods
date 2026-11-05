import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

vi.mock("../../../src/llm.js", () => ({
    summarizeTask: vi.fn(),
}));

vi.mock("../../../src/nodes/helpers.js", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../../src/nodes/helpers.js")>();
    return {
        ...original,
        saveOutputFile: vi.fn(async () => {}),
    };
});

const { taskSummarizer } = await import("../../../src/nodes/taskSummarizer.js");
const { summarizeTask } = await import("../../../src/llm.js");
const { saveOutputFile } = await import("../../../src/nodes/helpers.js");

describe("taskSummarizer", () => {
    beforeEach(() => {
        vi.mocked(summarizeTask).mockReset();
        vi.mocked(saveOutputFile).mockClear();
    });

    it("returns an empty update when there is no current task", async () => {
        await expect(taskSummarizer(buildState())).resolves.toEqual({});
    });

    it("returns an empty update when there are no qa pairs", async () => {
        const result = await taskSummarizer(
            buildState({
                currentTask: {
                    id: "task-1",
                    name: "Tarea",
                    actions: [{ id: "q1", type: "question", content: "Pregunta" }],
                },
            }),
        );

        expect(result).toEqual({});
        expect(summarizeTask).not.toHaveBeenCalled();
    });

    it("summarizes the current task and persists it", async () => {
        vi.mocked(summarizeTask).mockResolvedValueOnce("Resumen de tarea");

        const result = await taskSummarizer(
            buildState({
                outputFileName: "session.json",
                profile: {
                    allowFollowUps: true,
                    allowDoubtConfirmation: true,
                    allowKnowledgeConsultation: true,
                    generateTaskSummaries: true,
                    saveTaskSummariesToOutput: true,
                    hooks: {},
                },
                currentTask: {
                    id: "task-1",
                    name: "Tarea",
                    actions: [{ id: "q1", type: "question", content: "Pregunta" }],
                },
                outputJson: {
                    "record:task-1:q1": {
                        question: "Pregunta",
                        summary: "Respuesta resumida",
                    },
                },
            }),
        );

        expect(summarizeTask).toHaveBeenCalledWith("Tarea", [
            { question: "Pregunta", answer: "Respuesta resumida" },
        ]);
        expect(result.taskSummaries).toEqual({
            "task-1": "Resumen de tarea",
        });
        expect(result.outputJson).toEqual({
            "record:task-1:q1": {
                question: "Pregunta",
                summary: "Respuesta resumida",
            },
            "task-1:summary": {
                task_id: "task-1",
                action_id: "task_summary",
                summary: "Resumen de tarea",
            },
        });
        expect(saveOutputFile).toHaveBeenCalledWith(result.outputJson, "session.json");
    });
});
