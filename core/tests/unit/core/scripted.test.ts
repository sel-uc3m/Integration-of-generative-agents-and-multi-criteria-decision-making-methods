import { beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.fn();

vi.mock("fs/promises", () => ({
    readFile,
}));

const {
    consumeScriptedResponse,
    hasScriptedResponses,
    loadScriptedResponses,
    resetScriptedStore,
} = await import("../../../src/scripted.js");

describe("scripted store", () => {
    beforeEach(() => {
        readFile.mockReset();
        resetScriptedStore();
    });

    it("loads scripted responses from a JSON file", async () => {
        readFile.mockResolvedValueOnce(
            JSON.stringify([{ actionId: "q1", response: "Respuesta" }]),
        );

        await loadScriptedResponses("responses.json");

        expect(hasScriptedResponses()).toBe(true);
        expect(consumeScriptedResponse({ actionId: "q1" })).toBe("Respuesta");
        expect(hasScriptedResponses()).toBe(false);
    });

    it("rejects invalid file payloads", async () => {
        readFile.mockResolvedValueOnce(JSON.stringify({ actionId: "q1" }));

        await expect(loadScriptedResponses("responses.json")).rejects.toThrow(
            "Scripted responses file must be a JSON array",
        );
    });

    it("rejects invalid optional scoped fields", async () => {
        readFile.mockResolvedValueOnce(
            JSON.stringify([
                {
                    actionId: "q1",
                    response: "Respuesta",
                    questionIndex: -1,
                },
            ]),
        );

        await expect(loadScriptedResponses("responses.json")).rejects.toThrow(
            "Optional fields must be valid",
        );
    });

    it("consumes responses using priority scoped+index, then scoped, then legacy", () => {
        resetScriptedStore([
            { actionId: "q1", response: "Legacy" },
            { actionId: "q1", source: "altus", taskId: "task-1", response: "Scoped" },
            {
                actionId: "q1",
                source: "altus",
                taskId: "task-1",
                questionIndex: 1,
                response: "ScopedIndexed",
            },
        ]);

        expect(
            consumeScriptedResponse({
                actionId: "q1",
                source: "altus",
                taskId: "task-1",
                questionIndex: 1,
            }),
        ).toBe("ScopedIndexed");
        expect(
            consumeScriptedResponse({
                actionId: "q1",
                source: "altus",
                taskId: "task-1",
                questionIndex: 0,
            }),
        ).toBe("Scoped");
        expect(consumeScriptedResponse({ actionId: "q1" })).toBe("Legacy");
        expect(consumeScriptedResponse({ actionId: "q1" })).toBeNull();
    });
});
