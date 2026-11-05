import { describe, expect, it } from "vitest";
import { taskLoader } from "../../../src/nodes/taskLoader.js";
import { buildStateFromTasks, sampleTasks } from "../../fixtures/index.js";

describe("taskLoader", () => {
    it("marks completion when queue is empty", async () => {
        const state = buildStateFromTasks([]);
        const result = await taskLoader(state);

        expect(result.isComplete).toBe(true);
        expect(result.currentTask).toBe(null);
        expect(result.currentAction).toBe(null);
        expect(result.actionQueue).toEqual([]);
    });

    it("loads the first task and its actions", async () => {
        const state = buildStateFromTasks(sampleTasks);
        const result = await taskLoader(state);

        expect(result.currentTask?.id).toBe("task-1");
        expect(result.actionQueue?.length).toBe(2);
        expect(result.isComplete).toBe(false);
    });

    it("removes the loaded task from the queue", async () => {
        const extra = {
            id: "task-2",
            source: "altus" as const,
            name: "Otra tarea",
            actions: [],
        };
        const state = buildStateFromTasks([...sampleTasks, extra]);
        const result = await taskLoader(state);

        expect(result.currentTask?.id).toBe("task-1");
        expect(result.taskQueue?.length).toBe(1);
        expect(result.taskQueue?.[0].id).toBe("task-2");
    });
});
