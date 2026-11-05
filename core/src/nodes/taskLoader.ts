import { GraphState, NodeResult } from "../types.js";

export async function taskLoader(state: GraphState): Promise<NodeResult> {
  if (state.taskQueue.length === 0) {
    return {
      isComplete: true,
      currentTask: null,
      currentAction: null,
      actionQueue: [],
    };
  }

  const [currentTask, ...remainingTasks] = state.taskQueue;

  return {
    currentTask,
    taskQueue: remainingTasks,
    actionQueue: [...currentTask.actions],
    isComplete: false,
  };
}
