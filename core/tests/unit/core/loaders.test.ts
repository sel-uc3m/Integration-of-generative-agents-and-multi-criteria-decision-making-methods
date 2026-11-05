import { beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.fn();

vi.mock("fs/promises", () => ({
    readFile,
}));

const { loadSession } = await import("../../../src/loaders.js");

describe("loadSession", () => {
    beforeEach(() => {
        readFile.mockReset();
    });

    it("loads a unified session file correctly", async () => {
        readFile.mockResolvedValueOnce(
            JSON.stringify({
                session_id: "ALTUS_FULL",
                profile: {
                    allowFollowUps: true,
                    allowDoubtConfirmation: true,
                    allowKnowledgeConsultation: true,
                    generateTaskSummaries: true,
                    saveTaskSummariesToOutput: false,
                    hooks: {}
                },
                tasks: [
                    {
                        id: "2_GOB",
                        name: "Gestionado - Gobierno",
                        metadata: {
                            maturityLevel: 2,
                            maturityName: "Gestionado",
                        },
                        actions: [
                            { id: "q1", type: "question", content: "Pregunta 1" },
                            { id: "i1", type: "internal", content: "Accion interna" },
                        ],
                    },
                ],
            }),
        );

        const session = await loadSession("session.json");

        expect(session.sessionId).toBe("ALTUS_FULL");
        expect(session.profile.allowFollowUps).toBe(true);
        expect(session.tasks).toEqual([
            {
                id: "2_GOB",
                name: "Gestionado - Gobierno",
                metadata: {
                    maturityLevel: 2,
                    maturityName: "Gestionado",
                },
                actions: [
                    { id: "q1", type: "question", content: "Pregunta 1" },
                    { id: "i1", type: "internal", content: "Accion interna" },
                ],
            },
        ]);
    });
});
