import { readFile } from "fs/promises";
import { Task, GraphProfile } from "./types.js";

export async function loadSession(filePath: string): Promise<{
  sessionId: string;
  profile: GraphProfile;
  tasks: Task[];
}> {
  const rawData = await readFile(filePath, "utf-8");
  const data = JSON.parse(rawData);

  if (!data.session_id || !data.profile || !Array.isArray(data.tasks)) {
    throw new Error(
      `Invalid session JSON file. It must contain 'session_id', 'profile', and 'tasks' array.`
    );
  }

  const tasks: Task[] = data.tasks.map((task: any) => {
    if (!task.id || !task.name || !Array.isArray(task.actions)) {
      throw new Error(
        `Invalid task object in JSON. Each task must have 'id', 'name', and 'actions' array.`
      );
    }

    return {
      id: task.id,
      name: task.name,
      metadata: task.metadata,
      actions: task.actions.map((action: any) => {
        if (!action.id || !action.type || !action.content) {
          throw new Error(
            `Invalid action object in task ${task.id}. Each action must have 'id', 'type', and 'content'.`
          );
        }
        return {
          id: action.id,
          type: action.type,
          content: action.content,
          instruction: action.instruction,
          outputVar: action.outputVar,
          sourceVar: action.sourceVar,
          unrollType: action.unrollType,
          templateQuestion: action.templateQuestion,
          templateInstruction: action.templateInstruction,
          outputVarItem: action.outputVarItem,
          outputSchema: action.outputSchema,
        };
      }),
    };
  });

  return {
    sessionId: data.session_id,
    profile: data.profile,
    tasks,
  };
}
