export type EvaluateAnswerCase = {
  name: string;
  question: string;
  answer: string;
  expectedQuality: "sufficient" | "insufficient";
  followUpAttempts: number;
  expectedNextStep: "stop" | "ask_follow_up";
};

export const evaluateAnswerCases: EvaluateAnswerCase[] = [
  {
    name: "accepts concrete incident logging workflow from the app domain",
    question: "Como registras las incidencias operativas que ocurren en tienda?",
    answer:
      "Las registramos en una hoja compartida de Google Sheets. El encargado apunta la fecha, la tienda, el tipo de incidencia, lo que se hizo y si queda algo pendiente antes de cerrar el turno.",
    expectedQuality: "sufficient",
    followUpAttempts: 0,
    expectedNextStep: "stop",
  },
  {
    name: "accepts clear absence of a central procedure repository as final",
    question: "Teneis un repositorio centralizado donde guardar procedimientos e instrucciones?",
    answer:
      "No, no tenemos un repositorio centralizado. Cada area guarda sus documentos como puede y ahora mismo no hay nada comun.",
    expectedQuality: "sufficient",
    followUpAttempts: 0,
    expectedNextStep: "stop",
  },
  {
    name: "accepts explicit negative answer when there is nothing else to add",
    question: "Haceis simulacros o ejercicios para preparar incidencias graves?",
    answer: "No.",
    expectedQuality: "sufficient",
    followUpAttempts: 0,
    expectedNextStep: "stop",
  },
  {
    name: "asks follow up on first vague onboarding answer",
    question: "Como formáis a las nuevas incorporaciones en tienda?",
    answer: "De manera informal.",
    expectedQuality: "insufficient",
    followUpAttempts: 0,
    expectedNextStep: "ask_follow_up",
  },
  {
    name: "stops after repeated vague onboarding answer",
    question: "Como formáis a las nuevas incorporaciones en tienda?",
    answer: "Pues sobre la marcha, como podemos.",
    expectedQuality: "insufficient",
    followUpAttempts: 2,
    expectedNextStep: "stop",
  },
  {
    name: "asks follow up on generic policy update answer in early attempt",
    question: "Como actualizais los procedimientos cuando cambia una norma o una instruccion interna?",
    answer: "Lo revisamos cuando hace falta.",
    expectedQuality: "insufficient",
    followUpAttempts: 0,
    expectedNextStep: "ask_follow_up",
  },
  {
    name: "stops after repeated generic answer about policy updates",
    question: "Como actualizais los procedimientos cuando cambia una norma o una instruccion interna?",
    answer: "Lo revisamos cuando hace falta.",
    expectedQuality: "insufficient",
    followUpAttempts: 3,
    expectedNextStep: "stop",
  },
  {
    name: "stops on non knowledge answer after several attempts",
    question: "Que herramientas usais para compartir conocimiento entre tiendas o equipos?",
    answer: "No se.",
    expectedQuality: "insufficient",
    followUpAttempts: 2,
    expectedNextStep: "stop",
  },
];
