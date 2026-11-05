import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

vi.mock("../../../src/llm.js", () => ({
    clarifyDoubt: vi.fn(),
}));

const { knowledgeConsultant } = await import(
    "../../../src/nodes/knowledgeConsultant.js"
);
const { clarifyDoubt } = await import("../../../src/llm.js");

describe("knowledgeConsultant", () => {
    beforeEach(() => {
        vi.mocked(clarifyDoubt).mockReset();
    });

    it("returns an empty update when there is no action", async () => {
        await expect(knowledgeConsultant(buildState())).resolves.toEqual({});
    });

    it("stores the clarification returned by the llm", async () => {
        vi.mocked(clarifyDoubt).mockResolvedValueOnce("Explicacion tecnica");

        const result = await knowledgeConsultant(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    result: "Que significa KPI?",
                },
            }),
        );

        expect(clarifyDoubt).toHaveBeenCalledWith("Que significa KPI?");
        expect(result.currentAction?.doubtExplanation).toBe("Explicacion tecnica");
    });
});
