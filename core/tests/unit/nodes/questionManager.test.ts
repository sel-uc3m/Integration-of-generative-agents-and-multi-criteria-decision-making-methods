import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

const createInterface = vi.fn();

vi.mock("readline", () => ({
    createInterface,
}));

vi.mock("../../../src/llm.js", () => ({
    extractAnswerFromSummaries: vi.fn(),
    mergeClarificationWithQuestion: vi.fn(),
}));

vi.mock("../../../src/scripted.js", () => ({
    consumeScriptedResponse: vi.fn(),
    consumeDynamicFallback: vi.fn(async () => null),
    hasScriptedResponseFor: vi.fn(() => false),
}));

const { questionManager } = await import("../../../src/nodes/questionManager.js");
const { extractAnswerFromSummaries, mergeClarificationWithQuestion } = await import(
    "../../../src/llm.js"
);
const { consumeScriptedResponse, hasScriptedResponseFor } = await import("../../../src/scripted.js");

describe("questionManager", () => {
    beforeEach(() => {
        createInterface.mockReset();
        vi.mocked(extractAnswerFromSummaries).mockReset();
        vi.mocked(mergeClarificationWithQuestion).mockReset();
        vi.mocked(consumeScriptedResponse).mockReset();
        vi.mocked(extractAnswerFromSummaries).mockResolvedValue("");
        vi.mocked(mergeClarificationWithQuestion).mockImplementation(
            async (question) => question,
        );
        vi.mocked(consumeScriptedResponse).mockReturnValue(null);
    });

    it("returns an empty update when there is no action", async () => {
        await expect(questionManager(buildState())).resolves.toEqual({});
    });

    it("uses the scripted response with merged clarification when available", async () => {
        vi.mocked(mergeClarificationWithQuestion).mockResolvedValueOnce(
            "Explicacion. Pregunta aclarada",
        );
        vi.mocked(consumeScriptedResponse).mockReturnValueOnce("Respuesta guiada");

        const result = await questionManager(
            buildState({
                currentTask: {
                    id: "task-1",
                    source: "altus",
                    name: "Tarea",
                    actions: [],
                },
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta original",
                    followUpPrompt: "Pregunta de seguimiento",
                    doubtExplanation: "Explicacion",
                },
            }),
        );

        expect(mergeClarificationWithQuestion).toHaveBeenCalledWith(
            "Pregunta de seguimiento",
            "Explicacion",
        );
        expect(consumeScriptedResponse).toHaveBeenCalledWith({
            actionId: "q1",
            source: undefined,
            taskId: "task-1",
            questionIndex: 0,
        });
        expect(result.currentAction).toMatchObject({
            followUpQuestion: "Explicacion. Pregunta aclarada",
            result: "Respuesta guiada",
        });
    });

    it("reuses a whitespace-only extracted summary answer", async () => {
        vi.mocked(extractAnswerFromSummaries).mockResolvedValueOnce("   ");

        const result = await questionManager(
            buildState({
                taskSummaries: { "altus:task-0": "Resumen previo" },
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta original",
                },
            }),
        );

        expect(result.currentAction).toEqual({
            id: "q1",
            type: "question",
            content: "Pregunta original",
            followUpQuestion: "Pregunta original",
            result: "   ",
        });
        expect(consumeScriptedResponse).not.toHaveBeenCalled();
        expect(createInterface).not.toHaveBeenCalled();
    });

    it("falls back to readline when there is no scripted response", async () => {
        const question = vi.fn((prompt: string, callback: (value: string) => void) => {
            callback("  respuesta por consola  ");
        });
        const close = vi.fn();
        createInterface.mockReturnValueOnce({ question, close });

        const result = await questionManager(
            buildState({
                taskSummaries: { "altus:task-0": "Resumen previo" },
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta original",
                },
            }),
        );

        expect(question).toHaveBeenCalledWith(
            expect.stringContaining("Context summaries:\nTask altus:task-0: Resumen previo"),
            expect.any(Function),
        );
        expect(close).toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            followUpQuestion: "Pregunta original",
            result: "respuesta por consola",
        });
    });
});
