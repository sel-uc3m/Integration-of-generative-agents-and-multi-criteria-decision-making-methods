import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

vi.mock("../../../src/llm.js", () => ({
    evaluateAnswer: vi.fn(),
    generateInsufficientFollowUp: vi.fn(),
    rewriteQuestion: vi.fn(),
}));

const { architect } = await import("../../../src/nodes/architect.js");
const { evaluateAnswer, generateInsufficientFollowUp, rewriteQuestion } = await import(
    "../../../src/llm.js"
);

describe("architect", () => {
    beforeEach(() => {
        vi.mocked(evaluateAnswer).mockReset();
        vi.mocked(generateInsufficientFollowUp).mockReset();
        vi.mocked(rewriteQuestion).mockReset();
    });

    it("returns an empty update when there is no action", async () => {
        await expect(architect(buildState())).resolves.toEqual({});
    });

    it("adds a follow-up prompt when the evaluation asks for more detail", async () => {
        vi.mocked(evaluateAnswer).mockResolvedValueOnce({
            verdict: "insufficient",
            confidence: 0.86,
            nextStep: "ask_follow_up",
        });
        vi.mocked(generateInsufficientFollowUp).mockResolvedValueOnce(
            "Puedes concretar el alcance?",
        );

        const result = await architect(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Describe el alcance",
                    followUpPrompt: "Puedes concretar el alcance?",
                    result: "Muy amplio",
                },
            }),
        );

        expect(evaluateAnswer).toHaveBeenCalledWith(
            "Describe el alcance",
            "Interviewer: Puedes concretar el alcance?\n\nCandidate: Muy amplio",
            1,
            "",
            undefined,
        );
        expect(generateInsufficientFollowUp).toHaveBeenCalledWith(
            "Describe el alcance",
            "Interviewer: Puedes concretar el alcance?\n\nCandidate: Muy amplio",
            "",
        );
        expect(rewriteQuestion).not.toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            transcript: [
                {
                    role: "assistant",
                    type: "question",
                    content: "Puedes concretar el alcance?",
                },
                {
                    role: "user",
                    type: "answer",
                    content: "Muy amplio",
                },
            ],
            result: undefined,
            followUpPrompt: "Puedes concretar el alcance?",
        });
    });

    it("stops instead of rewriting when the latest turn reaches the maximum follow-up attempts", async () => {
        vi.mocked(evaluateAnswer).mockResolvedValueOnce({
            verdict: "insufficient",
            confidence: 0.72,
            nextStep: "ask_follow_up",
        });
        vi.mocked(generateInsufficientFollowUp).mockResolvedValueOnce("");
        vi.mocked(rewriteQuestion).mockResolvedValueOnce(
            "Que equipos participan exactamente?",
        );

        const result = await architect(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Describe el alcance",
                    transcript: [
                        { role: "assistant", type: "question", content: "Q1" },
                        { role: "user", type: "answer", content: "Equipo comercial" },
                        { role: "assistant", type: "question", content: "Q2" },
                        { role: "user", type: "answer", content: "Tambien operaciones" },
                    ],
                    result: "Y tambien postventa",
                },
            }),
        );

        expect(evaluateAnswer).toHaveBeenCalledWith(
            "Describe el alcance",
            "Interviewer: Q1\n\nCandidate: Equipo comercial\n\nInterviewer: Q2\n\nCandidate: Tambien operaciones\n\nInterviewer: Describe el alcance\n\nCandidate: Y tambien postventa",
            3,
            "",
            undefined,
        );
        expect(generateInsufficientFollowUp).not.toHaveBeenCalled();
        expect(rewriteQuestion).not.toHaveBeenCalled();
        expect(result.currentAction).toMatchObject({
            transcript: [
                { role: "assistant", type: "question", content: "Q1" },
                { role: "user", type: "answer", content: "Equipo comercial" },
                { role: "assistant", type: "question", content: "Q2" },
                { role: "user", type: "answer", content: "Tambien operaciones" },
                { role: "assistant", type: "question", content: "Describe el alcance" },
                { role: "user", type: "answer", content: "Y tambien postventa" },
            ],
            result: "Equipo comercial Tambien operaciones Y tambien postventa",
            followUpPrompt: undefined,
            followUpQuestion: undefined,
        });
    });

    it("stops asking when the evaluation says to stop", async () => {
        vi.mocked(evaluateAnswer).mockResolvedValueOnce({
            verdict: "insufficient",
            confidence: 0.81,
            nextStep: "stop",
        });

        const result = await architect(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Describe el alcance",
                    result: "No se explicarlo mejor",
                },
            }),
        );

        expect(generateInsufficientFollowUp).not.toHaveBeenCalled();
        expect(rewriteQuestion).not.toHaveBeenCalled();
        expect(evaluateAnswer).toHaveBeenCalledWith(
            "Describe el alcance",
            "Interviewer: Describe el alcance\n\nCandidate: No se explicarlo mejor",
            1,
            "",
            undefined,
        );
        expect(result.currentAction).toMatchObject({
            transcript: [
                {
                    role: "assistant",
                    type: "question",
                    content: "Describe el alcance",
                },
                {
                    role: "user",
                    type: "answer",
                    content: "No se explicarlo mejor",
                },
            ],
            result: "No se explicarlo mejor",
            followUpPrompt: undefined,
            followUpQuestion: undefined,
        });
    });

    it("forces stop after reaching the maximum number of previous follow-up attempts", async () => {
        vi.mocked(evaluateAnswer).mockResolvedValueOnce({
            verdict: "insufficient",
            confidence: 0.64,
            nextStep: "ask_follow_up",
        });

        const result = await architect(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Describe el alcance",
                    transcript: [
                        { role: "assistant", type: "question", content: "Q1" },
                        { role: "user", type: "answer", content: "Respuesta 1" },
                        { role: "assistant", type: "question", content: "Q2" },
                        { role: "user", type: "answer", content: "Respuesta 2" },
                    ],
                    result: "Respuesta 3",
                },
            }),
        );

        expect(generateInsufficientFollowUp).not.toHaveBeenCalled();
        expect(rewriteQuestion).not.toHaveBeenCalled();
        expect(evaluateAnswer).toHaveBeenCalledWith(
            "Describe el alcance",
            "Interviewer: Q1\n\nCandidate: Respuesta 1\n\nInterviewer: Q2\n\nCandidate: Respuesta 2\n\nInterviewer: Describe el alcance\n\nCandidate: Respuesta 3",
            3,
            "",
            undefined,
        );
        expect(result.currentAction).toMatchObject({
            transcript: [
                { role: "assistant", type: "question", content: "Q1" },
                { role: "user", type: "answer", content: "Respuesta 1" },
                { role: "assistant", type: "question", content: "Q2" },
                { role: "user", type: "answer", content: "Respuesta 2" },
                { role: "assistant", type: "question", content: "Describe el alcance" },
                { role: "user", type: "answer", content: "Respuesta 3" },
            ],
            result: "Respuesta 1 Respuesta 2 Respuesta 3",
            followUpPrompt: undefined,
            followUpQuestion: undefined,
        });
    });
});
