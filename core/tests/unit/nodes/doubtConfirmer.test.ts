import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

const createInterface = vi.fn();

vi.mock("readline", () => ({
    createInterface,
}));

vi.mock("../../../src/scripted.js", () => ({
    consumeScriptedResponse: vi.fn(() => null),
}));

const { doubtConfirmer } = await import("../../../src/nodes/doubtConfirmer.js");
const { consumeScriptedResponse } = await import("../../../src/scripted.js");

describe("doubtConfirmer", () => {
    beforeEach(() => {
        createInterface.mockReset();
        vi.mocked(consumeScriptedResponse).mockReset();
        vi.mocked(consumeScriptedResponse).mockReturnValue(null);
    });

    it("returns an empty update when there is no action", async () => {
        await expect(doubtConfirmer(buildState())).resolves.toEqual({});
    });

    it("stores doubtConfirmed as true when the user confirms it was a doubt", async () => {
        const question = vi.fn((prompt: string, callback: (value: string) => void) => {
            callback("si");
        });
        const close = vi.fn();

        createInterface.mockReturnValueOnce({ question, close });

        const result = await doubtConfirmer(
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
                    content: "Como registras incidencias?",
                    result: "No se si te refieres a tienda o a oficina.",
                },
            }),
        );

        expect(question).toHaveBeenCalledWith(
            expect.stringContaining("No tengo claro si lo que acabas de decir era una duda"),
            expect.any(Function),
        );
        expect(close).toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            id: "q1",
            type: "question",
            content: "Como registras incidencias?",
            result: "No se si te refieres a tienda o a oficina.",
            doubtConfirmed: true,
            doubtExplanation: undefined,
            followUpPrompt: undefined,
        });
    });

    it("stores doubtConfirmed as false when the user denies it was a doubt", async () => {
        const question = vi.fn((prompt: string, callback: (value: string) => void) => {
            callback("no");
        });
        const close = vi.fn();

        createInterface.mockReturnValueOnce({ question, close });

        const result = await doubtConfirmer(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Como registras incidencias?",
                    result: "No se si te refieres a tienda o a oficina.",
                    doubtConfirmed: true,
                    doubtExplanation: "Texto previo",
                    followUpPrompt: "Aclaro algo",
                },
            }),
        );

        expect(close).toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            id: "q1",
            type: "question",
            content: "Como registras incidencias?",
            result: "No se si te refieres a tienda o a oficina.",
            doubtConfirmed: false,
            doubtExplanation: undefined,
            followUpPrompt: undefined,
        });
    });

    it("treats unclear confirmation as not confirmed", async () => {
        const question = vi.fn((prompt: string, callback: (value: string) => void) => {
            callback("puede ser");
        });
        const close = vi.fn();

        createInterface.mockReturnValueOnce({ question, close });

        const result = await doubtConfirmer(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Como registras incidencias?",
                    result: "No se si te refieres a tienda o a oficina.",
                    doubtConfirmed: true,
                    doubtExplanation: "Texto previo",
                    followUpPrompt: "Aclaro algo",
                },
            }),
        );

        expect(close).toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            id: "q1",
            result: "No se si te refieres a tienda o a oficina.",
            doubtConfirmed: false,
            doubtExplanation: undefined,
            followUpPrompt: undefined,
        });
    });

    it("trims and normalizes the confirmation answer", async () => {
        const question = vi.fn((prompt: string, callback: (value: string) => void) => {
            callback("  Sí  ");
        });
        const close = vi.fn();

        createInterface.mockReturnValueOnce({ question, close });

        const result = await doubtConfirmer(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Como registras incidencias?",
                    result: "No se si te refieres a tienda o a oficina.",
                },
            }),
        );

        expect(close).toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            id: "q1",
            result: "No se si te refieres a tienda o a oficina.",
            doubtConfirmed: true,
            doubtExplanation: undefined,
            followUpPrompt: undefined,
        });
    });

    it("uses scripted confirmation responses when available", async () => {
        vi.mocked(consumeScriptedResponse).mockReturnValueOnce("si");

        const result = await doubtConfirmer(
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
                    content: "Como registras incidencias?",
                    transcript: [{ role: "assistant", type: "question", content: "Pregunta previa" }, { role: "user", type: "answer", content: "Respuesta previa" }],
                    result: "No se si te refieres a tienda o a oficina.",
                },
            }),
        );

        expect(consumeScriptedResponse).toHaveBeenCalledWith({
            actionId: "q1",
            source: undefined,
            taskId: "task-1",
            questionIndex: 2,
        });
        expect(createInterface).not.toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            id: "q1",
            result: "No se si te refieres a tienda o a oficina.",
            doubtConfirmed: true,
            doubtExplanation: undefined,
            followUpPrompt: undefined,
        });
    });
});