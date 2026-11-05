import { z } from "zod";

export const ClassifyResponseSchema = z.object({
  explicacion_decisiones: z
    .string()
    .describe(
      "Razonamiento paso a paso de por qué se toma esta decisión basándose en el input del usuario.",
    ),
  intent: z
    .enum(["doubt", "response"])
    .describe(
      "El intento del usuario. 'doubt' para pedir aclaraciones o significado, 'response' si aporta información (incluso negativa o corta).",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Nivel de confianza en la clasificación entre 0.0 y 1.0."),
});

export const EvaluateAnswerSchema = z.object({
  explicacion_evaluacion: z
    .string()
    .describe(
      "Razonamiento detallado explicando por qué se considera la respuesta suficiente o insuficiente, justificando el veredicto basándose en el historial y el contexto de acciones previas.",
    ),
  verdict: z
    .enum(["sufficient", "insufficient"])
    .describe(
      "Calidad de la respuesta. 'sufficient' si da detalle útil operativo o dice claramente que no existe.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Nivel de confianza en la evaluación entre 0.0 y 1.0"),
  nextStep: z
    .enum(["stop", "ask_follow_up"])
    .describe(
      "Siguiente paso lógico. 'ask_follow_up' si se puede recuperar información faltante, 'stop' si es suficiente o si presionar más no aportará valor.",
    ),
});

export const ClarifyDoubtSchema = z.object({
  explicacion: z
    .string()
    .describe("La aclaración técnica concisa para el usuario."),
});

export const RewriteQuestionSchema = z.object({
  rewritten_question: z
    .string()
    .describe("La pregunta reformulada de forma directa y simple."),
});

export const MergeClarificationSchema = z.object({
  merged_text: z
    .string()
    .describe(
      "El párrafo único que combina la aclaración y la pregunta original.",
    ),
});

export const FollowUpSchema = z.object({
  razonamiento_seguimiento: z
    .string()
    .describe(
      "Explicación de qué detalle falta y por qué esta pregunta ayudará a obtenerlo.",
    ),
  question: z
    .string()
    .describe("La pregunta de seguimiento corta y directa."),
});

export const SummarizeTaskSchema = z.object({
  summary: z.string().describe("El resumen global de la tarea."),
});

export const SummarizeActionSchema = z.object({
  summary: z
    .string()
    .describe("El resumen coherente que preserva detalles concretos."),
});

export const ExtractAnswerSchema = z.object({
  can_be_deduced: z
    .boolean()
    .describe(
      "true ONLY if the summaries contain explicit, unambiguous facts to fully answer the question. false if information is missing or unclear.",
    ),
  answer: z
    .string()
    .describe(
      "If can_be_deduced is true, the complete, detailed factual answer. If can_be_deduced is false, this MUST be an empty string.",
    ),
});
