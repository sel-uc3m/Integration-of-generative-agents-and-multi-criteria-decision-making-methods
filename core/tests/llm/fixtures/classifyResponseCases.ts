export type ClassifyResponseCase = {
  name: string;
  question: string;
  response: string;
  expectedIntent: "doubt" | "response";
  minConfidence: number;
  expectedRoute: "doubt" | "confirm_doubt" | "response";
};

export const classifyResponseCases: ClassifyResponseCase[] = [
  {
    name: "marks direct clarification request as doubt with high confidence",
    question: "Que indicadores usas para medir el rendimiento del negocio?",
    response: "Que significa KPI?",
    expectedIntent: "doubt",
    minConfidence: 0.8,
    expectedRoute: "doubt",
  },
  {
    name: "marks lack of understanding as doubt with high confidence",
    question: "Como documentais los procesos internos?",
    response: "No entiendo a que te refieres con procesos internos.",
    expectedIntent: "doubt",
    minConfidence: 0.8,
    expectedRoute: "doubt",
  },
  {
    name: "marks direct business context as response with high confidence",
    question: "Describe tu rol actual.",
    response: "Soy responsable de operaciones y coordino a 5 personas.",
    expectedIntent: "response",
    minConfidence: 0.8,
    expectedRoute: "response",
  },
  {
    name: "marks negative but informative answer as response with high confidence",
    question: "Teneis una base de conocimiento interna?",
    response: "No, todavia no tenemos una base de conocimiento formal.",
    expectedIntent: "response",
    minConfidence: 0.8,
    expectedRoute: "response",
  },
  {
    name: "marks current reality and goals as response with high confidence",
    question: "Como compartis conocimiento entre turnos?",
    response: "Ahora lo hacemos por WhatsApp, pero queremos centralizarlo mejor.",
    expectedIntent: "response",
    minConfidence: 0.75,
    expectedRoute: "response",
  },
  {
    name: "marks ambiguous clarification as doubt requiring confirmation",
    question: "Como registras incidencias operativas?",
    response: "No se si te refieres a las de tienda o a las tecnicas.",
    expectedIntent: "doubt",
    minConfidence: 0.5,
    expectedRoute: "confirm_doubt",
  },
];