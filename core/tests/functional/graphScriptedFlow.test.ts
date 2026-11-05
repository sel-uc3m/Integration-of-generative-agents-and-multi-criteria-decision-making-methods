/**
 * Functional test: end-to-end graph execution with scripted responses.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGraph } from "../../src/graph.js";
import { buildStateFromTasks } from "../fixtures/index.js";
import { resetScriptedStore } from "../../src/scripted.js";
import { Task } from "../../src/types.js";

vi.mock("../../src/llm.js", () => ({
    classifyResponse: vi.fn(async () => ({
        intent: "response",
        confidence: 0.98,
    })),
    evaluateAnswer: vi.fn(async () => ({
        verdict: "sufficient",
        confidence: 0.95,
        nextStep: "stop",
    })),
    generateInsufficientFollowUp: vi.fn(async () => "Puedes dar mas detalle?"),
    rewriteQuestion: vi.fn(async (q: string) => q),
    summarizeActionAnswer: vi.fn(
        async (_q: string, _t: unknown, answer: string) => answer,
    ),
    summarizeTask: vi.fn(async () => "Resumen de tarea."),
    clarifyDoubt: vi.fn(async (q: string) => `Aclaracion sobre: ${q}`),
    extractAnswerFromSummaries: vi.fn(async () => ""),
    mergeClarificationWithQuestion: vi.fn(async (q: string) => q),
    evaluateActionQualification: vi.fn(async () => ({
        qualification: 5,
        reasoning: "Test reasoning",
    })),
}));

vi.mock("../../src/nodes/helpers.js", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../src/nodes/helpers.js")>();
    return {
        ...original,
        saveOutputFile: vi.fn(async () => {}),
    };
});

const tasks: Task[] = [
    {
        id: "task-1",
        name: "Evaluacion de conocimiento",
        actions: [
            { id: "q1", type: "question", content: "Describe tu rol actual." },
            { id: "q2", type: "question", content: "Cuantos anos de experiencia tienes?" },
        ],
    },
];

describe("graph – scripted flow", () => {
    beforeEach(() => {
        resetScriptedStore();
    });

    it("completes a full run using only scripted responses", async () => {
        resetScriptedStore([
            { actionId: "q1", response: "Soy ingeniero de software." },
            { actionId: "q2", response: "Tengo 5 anos de experiencia." },
        ]);

        const mockProfile = {
            allowFollowUps: true,
            allowDoubtConfirmation: true,
            allowKnowledgeConsultation: true,
            generateTaskSummaries: true,
            saveTaskSummariesToOutput: true,
            hooks: {}
        };

        const graph = createGraph(mockProfile);
        const state = buildStateFromTasks(tasks, { profile: mockProfile });
        const finalState = await graph.invoke(state, { recursionLimit: 100 });

        expect(finalState.isComplete).toBe(true);

        const q1 = finalState.outputJson["record:task-1:q1"] as {
            complete_answer: string;
            partial: Array<{ role: string; type: string; content: string }>;
        };
        const q2 = finalState.outputJson["record:task-1:q2"] as {
            complete_answer: string;
        };

        expect(q1.complete_answer).toBe("Soy ingeniero de software.");
        expect(q2.complete_answer).toBe("Tengo 5 anos de experiencia.");
    });

    it("repeats scripted response when the graph asks the same action multiple times", async () => {
        const { evaluateAnswer } = await import("../../src/llm.js");
        vi.mocked(evaluateAnswer)
            .mockResolvedValueOnce({
                verdict: "insufficient",
                confidence: 0.9,
                nextStep: "ask_follow_up",
                explicacion_evaluacion: "Falta detalle",
            })
            .mockResolvedValueOnce({
                verdict: "insufficient",
                confidence: 0.88,
                nextStep: "ask_follow_up",
                explicacion_evaluacion: "Aun falta detalle",
            })
            .mockResolvedValue({
                verdict: "sufficient",
                confidence: 0.95,
                nextStep: "stop",
                explicacion_evaluacion: "Suficiente",
            });

        resetScriptedStore([
            { actionId: "q1", response: "Soy ingeniero." },
            { actionId: "q1", response: "Trabajo en backend." },
            { actionId: "q1", response: "Soy ingeniero de software con 5 anos en backend." },
            { actionId: "q2", response: "Cinco anos." },
        ]);

        const mockProfile = {
            allowFollowUps: true,
            allowDoubtConfirmation: true,
            allowKnowledgeConsultation: true,
            generateTaskSummaries: true,
            saveTaskSummariesToOutput: true,
            hooks: {}
        };

        const graph = createGraph(mockProfile);
        const state = buildStateFromTasks(tasks, { profile: mockProfile });
        const finalState = await graph.invoke(state, { recursionLimit: 100 });

        const q1 = finalState.outputJson["record:task-1:q1"] as {
            partial: Array<{ role: string; type: string; content: string }>;
            complete_answer: string;
        };

        expect(q1.partial?.filter(m => m.role === "user" && m.type === "answer").length).toBe(3);
        expect(q1.complete_answer).toContain("Soy ingeniero");
    });

    it("drains scripted responses in order across multiple tasks", async () => {
        const twoTaskScenario: Task[] = [
            {
                id: "task-A",
                name: "Primera tarea",
                actions: [{ id: "a1", type: "question", content: "Pregunta A1." }],
            },
            {
                id: "task-B",
                name: "Segunda tarea",
                actions: [{ id: "b1", type: "question", content: "Pregunta B1." }],
            },
        ];

        resetScriptedStore([
            { actionId: "a1", response: "Respuesta A1." },
            { actionId: "b1", response: "Respuesta B1." },
        ]);

        const mockProfile = {
            allowFollowUps: true,
            allowDoubtConfirmation: true,
            allowKnowledgeConsultation: true,
            generateTaskSummaries: true,
            saveTaskSummariesToOutput: true,
            hooks: {}
        };

        const graph = createGraph(mockProfile);
        const state = buildStateFromTasks(twoTaskScenario, { profile: mockProfile });
        const finalState = await graph.invoke(state, { recursionLimit: 100 });

        expect(finalState.isComplete).toBe(true);

        const a1 = finalState.outputJson["record:task-A:a1"] as {
            complete_answer: string;
        };
        const b1 = finalState.outputJson["record:task-B:b1"] as {
            complete_answer: string;
        };

        expect(a1.complete_answer).toBe("Respuesta A1.");
        expect(b1.complete_answer).toBe("Respuesta B1.");
    });
});
