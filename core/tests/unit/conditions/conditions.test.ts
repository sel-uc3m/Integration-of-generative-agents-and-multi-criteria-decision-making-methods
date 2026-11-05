import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildState } from "../../fixtures/index.js";
import {
    checkActionQueue,
    checkArchitectDecision,
    checkTaskQueue,
    determineActionType,
    router,
} from "../../../src/conditions.js";
import { classifyResponse } from "../../../src/llm.js";

vi.mock("../../../src/llm.js", () => ({
    classifyResponse: vi.fn(),
}));

describe("Conditions", () => {
    beforeEach(() => {
        vi.mocked(classifyResponse).mockReset();
    });

    describe("checkActionQueue", () => {
        it("returns empty when no pending actions remain", async () => {
            const verdict = await checkActionQueue(buildState());
            expect(verdict).toBe("empty");
        });

        it("returns hasAction when queue still contains actions", async () => {
            const verdict = await checkActionQueue(
                buildState({
                    actionQueue: [{ id: "q1", type: "question", content: "Pregunta" }],
                }),
            );
            expect(verdict).toBe("hasAction");
        });
    });

    describe("checkArchitectDecision", () => {
        it("returns the nextStep stored in the current action", async () => {
            const state = buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    nextStep: "ask_follow_up",
                },
            });

            const verdict = await checkArchitectDecision(state);
            expect(verdict).toBe("ask_follow_up");
        });

        it("defaults to stop if no nextStep is present", async () => {
            const state = buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                },
            });

            const verdict = await checkArchitectDecision(state);
            expect(verdict).toBe("stop");
        });
    });

    describe("checkTaskQueue", () => {
        it("returns empty when graph is complete", async () => {
            const verdict = await checkTaskQueue(buildState({ isComplete: true }));
            expect(verdict).toBe("empty");
        });

        it("returns hasTask when graph is not complete", async () => {
            const verdict = await checkTaskQueue(buildState({ isComplete: false }));
            expect(verdict).toBe("hasTask");
        });
    });

    describe("determineActionType", () => {
        it("returns current action type when present", async () => {
            const verdict = await determineActionType(
                buildState({
                    currentAction: { id: "step-1", type: "internal", content: "Calcular" },
                }),
            );
            expect(verdict).toBe("internal");
        });

        it("defaults to question when there is no current action", async () => {
            const verdict = await determineActionType(buildState());
            expect(verdict).toBe("question");
        });
    });

    describe("router", () => {
        it("returns response when there is no answer yet", async () => {
            const verdict = await router(
                buildState({
                    currentAction: { id: "q1", type: "question", content: "Pregunta", result: "" },
                }),
            );

            expect(verdict).toBe("response");
            expect(classifyResponse).not.toHaveBeenCalled();
        });

        it("returns doubt when doubt was explicitly confirmed", async () => {
            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        result: "No se si te refieres a tienda o a oficina.",
                        doubtConfirmed: true,
                    },
                }),
            );

            expect(verdict).toBe("doubt");
            expect(classifyResponse).not.toHaveBeenCalled();
        });

        it("returns response when doubt was explicitly denied", async () => {
            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        result: "No se si te refieres a tienda o a oficina.",
                        doubtConfirmed: false,
                    },
                }),
            );

            expect(verdict).toBe("response");
            expect(classifyResponse).not.toHaveBeenCalled();
        });

        it("routes to doubt when confidence is high enough", async () => {
            vi.mocked(classifyResponse).mockResolvedValueOnce({
                intent: "doubt",
                confidence: 0.91,
            });

            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        followUpQuestion: "Pregunta aclarada",
                        result: "Que significa ese termino?",
                    },
                }),
            );

            expect(verdict).toBe("doubt");
            expect(classifyResponse).toHaveBeenCalledWith(
                "Que significa ese termino?",
                "Pregunta aclarada",
            );
        });

        it("routes to confirm_doubt when doubt confidence is intermediate", async () => {
            vi.mocked(classifyResponse).mockResolvedValueOnce({
                intent: "doubt",
                confidence: 0.62,
            });

            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        result: "No se si te refieres a tienda o a oficina.",
                    },
                }),
            );

            expect(verdict).toBe("confirm_doubt");
        });

        it("routes to response when doubt confidence is too low", async () => {
            vi.mocked(classifyResponse).mockResolvedValueOnce({
                intent: "doubt",
                confidence: 0.31,
            });

            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        result: "No se si te refieres a tienda o a oficina.",
                    },
                }),
            );

            expect(verdict).toBe("response");
        });

        it("routes to response when classified as response", async () => {
            vi.mocked(classifyResponse).mockResolvedValueOnce({
                intent: "response",
                confidence: 0.89,
            });

            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        followUpQuestion: "Pregunta aclarada",
                        result: "Usamos WhatsApp y una carpeta compartida.",
                    },
                }),
            );

            expect(verdict).toBe("response");
            expect(classifyResponse).toHaveBeenCalledWith(
                "Usamos WhatsApp y una carpeta compartida.",
                "Pregunta aclarada",
            );
        });

        it("routes to response when max doubt attempts have been reached", async () => {
            const verdict = await router(
                buildState({
                    currentAction: {
                        id: "q1",
                        type: "question",
                        content: "Pregunta original",
                        result: "¿Qué significa este término?",
                        transcript: [
                            { role: "assistant", type: "question", content: "Pregunta original" },
                            { role: "user", type: "doubt", content: "No entiendo" },
                            { role: "assistant", type: "clarification", content: "Aclaracion 1" },
                            { role: "user", type: "doubt", content: "Sigo sin entender" },
                            { role: "assistant", type: "clarification", content: "Aclaracion 2" },
                        ],
                    },
                }),
            );

            expect(verdict).toBe("response");
            expect(classifyResponse).not.toHaveBeenCalled();
        });
    });
});

