import { describe, expect, it } from "vitest";
import { extractAction } from "../../../src/nodes/extractAction.js";
import { buildState } from "../../fixtures/index.js";

describe("extractAction", () => {
    it("takes the first action from the queue", async () => {
        const result = await extractAction(
            buildState({
                actionQueue: [
                    { id: "q1", type: "question", content: "Pregunta 1" },
                    { id: "q2", type: "question", content: "Pregunta 2" },
                ],
            }),
        );

        expect(result.currentAction).toEqual({
            id: "q1",
            type: "question",
            content: "Pregunta 1",
        });
        expect(result.actionQueue).toEqual([
            { id: "q2", type: "question", content: "Pregunta 2" },
        ]);
    });

    it("returns undefined currentAction when the queue is empty", async () => {
        const result = await extractAction(buildState());

        expect(result.currentAction).toBeUndefined();
        expect(result.actionQueue).toEqual([]);
    });
});
