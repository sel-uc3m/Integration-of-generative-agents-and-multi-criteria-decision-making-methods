import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

vi.mock("../../../src/llm.js", () => ({
    summarizeActionAnswer: vi.fn(),
}));

const { actionAnswerSummarizer } = await import(
    "../../../src/nodes/actionAnswerSummarizer.js"
);
const { summarizeActionAnswer } = await import("../../../src/llm.js");

describe("actionAnswerSummarizer", () => {
    beforeEach(() => {
        vi.mocked(summarizeActionAnswer).mockReset();
    });

    it("returns an empty update when there is no action", async () => {
        await expect(actionAnswerSummarizer(buildState())).resolves.toEqual({});
    });

    it("keeps the complete answer as summary for a single turn", async () => {
        const result = await actionAnswerSummarizer(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    result: "Respuesta final",
                },
            }),
        );

        expect(summarizeActionAnswer).not.toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            completeAnswer: "Respuesta final",
            summary: "Respuesta final",
            transcript: [
                {
                    role: "assistant",
                    type: "question",
                    content: "Pregunta",
                },
                {
                    role: "user",
                    type: "answer",
                    content: "Respuesta final",
                },
            ],
        });
    });

    it("summarizes when there are multiple turns", async () => {
        vi.mocked(summarizeActionAnswer).mockResolvedValueOnce("Resumen sintetico");

        const result = await actionAnswerSummarizer(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    transcript: [
                        { role: "assistant", type: "question", content: "Pregunta" },
                        { role: "user", type: "answer", content: "Parte 1" }
                    ],
                    result: "Parte 2",
                },
            }),
        );

        expect(summarizeActionAnswer).toHaveBeenCalledWith(
            "Pregunta",
            [
                { question: "Pregunta", answer: "Parte 1" },
                { question: "Pregunta", answer: "Parte 2" },
            ],
            "Parte 1 Parte 2",
        );
        expect(result.currentAction?.summary).toBe("Resumen sintetico");
    });
});
