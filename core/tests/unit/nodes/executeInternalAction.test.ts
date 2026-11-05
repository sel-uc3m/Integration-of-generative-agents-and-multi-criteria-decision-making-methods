import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeInternalAction } from "../../../src/nodes/executeInternalAction.js";
import { buildState } from "../../fixtures/index.js";

vi.mock("../../../src/llm.js", () => ({
    executeInternalReasoning: vi.fn(),
}));

const { executeInternalReasoning } = await import("../../../src/llm.js");

describe("executeInternalAction", () => {
    beforeEach(() => {
        vi.mocked(executeInternalReasoning).mockReset();
    });

    it("returns an empty update when there is no action", async () => {
        await expect(executeInternalAction(buildState())).resolves.toEqual({});
    });

    it("stores the internal result and preserves the queue", async () => {
        vi.mocked(executeInternalReasoning).mockResolvedValueOnce("internal_action_result");

        const result = await executeInternalAction(
            buildState({
                currentTask: {
                    id: "task-1",
                    name: "Tarea",
                    actions: [],
                },
                currentAction: {
                    id: "i1",
                    type: "internal",
                    content: "Generar analisis",
                },
                actionQueue: [{ id: "q1", type: "question", content: "Pregunta" }],
            }),
        );

        expect(executeInternalReasoning).toHaveBeenCalled();
        expect(result.currentAction).toEqual({
            id: "i1",
            type: "internal",
            content: "Generar analisis",
            result: "internal_action_result",
        });
        expect(result.actionQueue).toEqual([
            { id: "q1", type: "question", content: "Pregunta" },
        ]);
    });
});
