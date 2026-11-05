import { beforeEach, describe, expect, it, vi } from "vitest";

const mkdir = vi.fn();
const writeFile = vi.fn();

vi.mock("fs/promises", () => ({
    mkdir,
    writeFile,
}));

const {
    buildActionOutputKey,
    buildMergedAnswer,
    buildPartialBreakdown,
    saveOutputFile,
} = await import("../../../src/nodes/helpers.js");

describe("helpers", () => {
    beforeEach(() => {
        mkdir.mockReset();
        writeFile.mockReset();
    });

    it("builds action output keys using taskId", () => {
        expect(
            buildActionOutputKey(
                { id: "task-1", name: "Tarea", actions: [] },
                { id: "q1", type: "question", content: "Pregunta" },
            ),
        ).toBe("record:task-1:q1");
    });

    it("falls back to unknown identifiers when task is missing", () => {
        expect(
            buildActionOutputKey(null, {
                id: "q1",
                type: "question",
                content: "Pregunta",
            }),
        ).toBe("record:unknown_task:q1");
    });

    it("merges user answers from transcript and result", () => {
        expect(
            buildMergedAnswer(
                [
                    { role: "assistant", type: "question", content: "Q1" },
                    { role: "user", type: "answer", content: "  Uno  " },
                    { role: "assistant", type: "clarification", content: "C1" },
                    { role: "assistant", type: "question", content: "Q1" },
                    { role: "user", type: "answer", content: "" },
                ],
                "  Dos ",
            ),
        ).toBe("Uno Dos");
    });

    it("builds transcript without duplicating the final turn", () => {
        const breakdown = buildPartialBreakdown({
            id: "q1",
            type: "question",
            content: "Pregunta base",
            followUpPrompt: "Seguimiento",
            transcript: [
                { role: "assistant", type: "question", content: "Seguimiento" },
                { role: "user", type: "answer", content: "Respuesta final" }
            ],
            result: "Respuesta final",
        });

        expect(breakdown).toHaveLength(2);
        expect(breakdown[1]).toEqual(
            { role: "user", type: "answer", content: "Respuesta final" },
        );
    });

    it("adds the final answer to the transcript when needed", () => {
        const breakdown = buildPartialBreakdown({
            id: "q1",
            type: "question",
            content: "Pregunta base",
            transcript: [
                { role: "assistant", type: "question", content: "Pregunta base" },
                { role: "user", type: "answer", content: "Respuesta parcial" }
            ],
            result: "Respuesta final",
        });

        expect(breakdown).toHaveLength(4);
        expect(breakdown[3]).toEqual(
            { role: "user", type: "answer", content: "Respuesta final" },
        );
    });

    it("writes the output file under results directory", async () => {
        const testData = {
            "task-1:q1": {
                action_id: "q1",
                answer: "ok"
            }
        };

        await saveOutputFile(testData, "session.json");

        expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("results"), {
            recursive: true,
        });
        
        expect(writeFile).toHaveBeenCalledWith(
            expect.stringContaining("results/session.json"),
            JSON.stringify(testData, null, 2),
            "utf-8",
        );
    });
});
