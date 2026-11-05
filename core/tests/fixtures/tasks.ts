import { Task } from "../../src/types.js";

export const sampleTasks: Task[] = [
    {
        id: "task-1",
        source: "altus",
        name: "Evaluacion conocimiento",
        maturityLevel: 1,
        maturityName: "Inicial",
        architecturalCode: "CONF",
        architecturalName: "Configuracion",
        actions: [
            {
                id: "q1",
                type: "question",
                content: "Describe tu rol actual.",
            },
            {
                id: "q2",
                type: "question",
                content: "Cuantos anos de experiencia tienes?",
            },
        ],
    },
];

export const sampleSipacTask: Task = {
    id: "sipac-1",
    source: "sipac",
    name: "SIPAC Process - sipac-1",
    actions: [
        {
            id: "step-1",
            type: "question",
            content: "Describe el proceso actual.",
        },
    ],
};
