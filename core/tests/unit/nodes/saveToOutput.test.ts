import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildState } from "../../fixtures/index.js";

vi.mock("../../../src/nodes/helpers.js", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../../src/nodes/helpers.js")>();
    return {
        ...original,
        saveOutputFile: vi.fn(async () => {}),
    };
});

const { saveToOutput } = await import("../../../src/nodes/saveToOutput.js");
const { saveOutputFile } = await import("../../../src/nodes/helpers.js");

describe("saveToOutput", () => {
    beforeEach(() => {
        vi.mocked(saveOutputFile).mockClear();
    });

    it("returns the state unchanged when there is no action", async () => {
        const state = buildState();
        const result = await saveToOutput(state);

        expect(result).toBe(state);
    });

    it("stores output including metadata and hookResults", async () => {
        const result = await saveToOutput(
            buildState({
                outputFileName: "session.json",
                currentTask: {
                    id: "task-1",
                    name: "Tarea",
                    metadata: {
                        maturity_level: 2,
                        maturity_name: "Gestionado",
                        architectural_code: "GOB",
                        architectural_name: "Gobierno"
                    },
                    actions: [],
                },
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    completeAnswer: "Respuesta completa",
                    summary: "Resumen",
                    hookResults: {
                        qualification: 4,
                        qualification_reasoning: "Buen nivel"
                    },
                    transcript: [
                        { role: "assistant", type: "question", content: "Pregunta" },
                        { role: "user", type: "answer", content: "Respuesta completa" },
                    ],
                },
            }),
        );

        expect(result.currentAction).toBeNull();
        expect(result.outputJson).toEqual({
            "record:task-1:q1": {
                task_id: "task-1",
                action_id: "q1",
                maturity_level: 2,
                maturity_name: "Gestionado",
                architectural_code: "GOB",
                architectural_name: "Gobierno",
                qualification: 4,
                qualification_reasoning: "Buen nivel",
                question: "Pregunta",
                summary: "Resumen",
                complete_answer: "Respuesta completa",
                partial: [
                    { role: "assistant", type: "question", content: "Pregunta" },
                    { role: "user", type: "answer", content: "Respuesta completa" },
                ],
            },
            "task-1:q1": {
                qualification: 4,
                qualification_reasoning: "Buen nivel",
                summary: "Resumen",
            },
        });
        expect(saveOutputFile).toHaveBeenCalledWith(result.outputJson, "session.json");
    });

    it("builds fallback output when task metadata is missing", async () => {
        const result = await saveToOutput(
            buildState({
                currentAction: {
                    id: "q1",
                    type: "question",
                    content: "Pregunta",
                    transcript: [
                        { role: "assistant", type: "question", content: "Pregunta" },
                        { role: "user", type: "answer", content: "Parte 1" },
                    ],
                    result: "Parte 2",
                },
            }),
        );

        expect(result.outputJson).toEqual({
            "record:unknown_task:q1": {
                task_id: "unknown_task",
                action_id: "q1",
                question: "Pregunta",
                summary: "Parte 1 Parte 2",
                complete_answer: "Parte 1 Parte 2",
                partial: [
                    { role: "assistant", type: "question", content: "Pregunta" },
                    { role: "user", type: "answer", content: "Parte 1" },
                    { role: "assistant", type: "question", content: "Pregunta" },
                    { role: "user", type: "answer", content: "Parte 2" },
                ],
            },
            "q1": "Parte 1 Parte 2",
        });
    });
});
