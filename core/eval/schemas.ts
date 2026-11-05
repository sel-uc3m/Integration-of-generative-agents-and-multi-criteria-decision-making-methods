import { z } from "zod";


/**
 * Schema for the Stakeholder Simulator response during ALTUS interview follow-ups.
 */
export const StakeholderSimulationSchema = z.object({
  isRedundant: z.boolean().describe(
    "Set to true ONLY IF the consultant's question requests information that was ALREADY PROVIDED in earlier turns of the session transcript."
  ),
  response: z.string().describe(
    "The conversational response in the first-person voice of the stakeholder. If isRedundant is true, politely inform them it was already mentioned. Otherwise, reveal ONLY the specific requested detail."
  ),
  reasoning: z.string().describe("Internal justification for why isRedundant was set to true or false.")
});

export type StakeholderSimulationOutput = z.infer<typeof StakeholderSimulationSchema>;

/**
 * Schema for Judge LLM evaluation of agent's follow-up questions in ALTUS.
 */
export const AltusFollowUpQualitySchema = z.object({
  score: z.number().int().min(0).max(3).describe("0: Repetitiva/bucle, 1: Cuasi-redundante/sin avance, 2: Específica/dirigida, 3: Excelente/escucha activa"),
  reasoning: z.string().describe("Explicación de la calificación asignada según la rúbrica.")
});

export type AltusFollowUpQualityOutput = z.infer<typeof AltusFollowUpQualitySchema>;

/**
 * Schema for Judge LLM semantic field matching in SIPAC (single pair).
 */
export const SipacFieldMatchingSchema = z.object({
  score: z.number().int().min(0).max(3).describe("Puntuación 0, 1, 2 o 3 según la rúbrica del campo."),
  reasoning: z.string().describe("Justificación técnica de la puntuación de similitud semántica.")
});

export type SipacFieldMatchingOutput = z.infer<typeof SipacFieldMatchingSchema>;

/**
 * Schema for single evaluated pair in SIPAC batch evaluation.
 */
export const SipacBatchEvaluationItemSchema = z.object({
  pairId: z.number().int().describe("ID de la pareja evaluada"),
  score: z.number().int().min(0).max(3).describe("Puntuación 0, 1, 2 o 3 según la rúbrica del campo."),
  reasoning: z.string().optional().default("").describe("Justificación técnica de la puntuación.")
});

/**
 * Schema for Judge LLM batch semantic field matching in SIPAC.
 */
export const SipacBatchMatchingSchema = z.object({
  evaluations: z.array(SipacBatchEvaluationItemSchema).describe("Lista de evaluaciones para cada pareja de elementos.")
});

export type SipacBatchEvaluationItem = z.infer<typeof SipacBatchEvaluationItemSchema>;
export type SipacBatchMatchingOutput = z.infer<typeof SipacBatchMatchingSchema>;


/**
 * Schema for Judge LLM evaluation of AHP criteria sets.
 */
export const AhpCriteriaEvaluationSchema = z.object({
  relevance: z.object({
    score: z.number().int().min(0).max(3),
    reasoning: z.string(),
  }),
  nonOverlap: z.object({
    score: z.number().int().min(0).max(3),
    reasoning: z.string(),
  }),
  completeness: z.object({
    score: z.number().int().min(0).max(3),
    reasoning: z.string(),
  }),
  justification: z.object({
    score: z.number().int().min(0).max(3),
    reasoning: z.string(),
  }),
});

export type AhpCriteriaEvaluationOutput = z.infer<typeof AhpCriteriaEvaluationSchema>;
