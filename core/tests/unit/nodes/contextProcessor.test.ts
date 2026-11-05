import { describe, expect, it } from "vitest";
import { contextProcessor } from "../../../src/nodes/contextProcessor.js";
import { buildState } from "../../fixtures/index.js";

describe("contextProcessor", () => {
    it("returns an empty update when there is no action", async () => {
        await expect(contextProcessor(buildState())).resolves.toEqual({});
    });

    it("preserves the current action and processed result", async () => {
        const result = await contextProcessor(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    result: "Respuesta",
                },
            }),
        );

        expect(result.currentAction).toEqual({
            id: "q1",
            type: "question",
            content: "Pregunta",
            result: "Respuesta",
        });
    });
});
