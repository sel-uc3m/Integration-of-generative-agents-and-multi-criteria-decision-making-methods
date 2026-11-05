import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AnswerEvaluation, ResponseClassification } from "../types.js";
import { MAX_FOLLOW_UP_ATTEMPTS } from "../config.js";
import { getClassifierLLM, getReasonerLLM, llm } from "./client.js";
import {
  ClassifyResponseSchema,
  EvaluateAnswerSchema,
  ClarifyDoubtSchema,
  RewriteQuestionSchema,
  MergeClarificationSchema,
  FollowUpSchema,
  SummarizeTaskSchema,
  SummarizeActionSchema,
  ExtractAnswerSchema,
} from "./schemas.js";

/**
 * Invokes the LLM to classify whether a user message is a doubt or a response.
 */
export async function classifyResponse(
  response: string,
  question: string,
): Promise<ResponseClassification> {
  const systemPrompt =
    "You are a high-precision classifier for interview conversations.\n\n" +
    "Your goal is to determine whether the user is primarily ANSWERING the question or ASKING for clarification.\n\n" +
    "CRITICAL: You must ALWAYS return a valid JSON object. Do not use markdown code blocks (like ```json). Do not include nested JSON objects inside strings.\n" +
    'The JSON object MUST have EXACTLY these keys: "explicacion_decisiones" (string), "intent" ("doubt" or "response"), and "confidence" (number between 0.0 and 1.0).\n\n' +
    "Rules:\n" +
    '- Use "doubt" only when the user is clearly asking for clarification, meaning, examples, or explicitly says they do not understand.\n' +
    '- Use "response" when the user provides business information, even if short, negative, incomplete, or uncertain.\n' +
    '- If the message could be interpreted both ways, prefer "response" unless the clarification intent is dominant.';

  const userPrompt = `CONTEXT (Question asked): "${question}"\nUSER INPUT to classify: "${response}"`;

  console.log(`[LLM][ClassifyResponse] input="${response}"`);

  let attempts = 0;
  let retryFeedback = "";
  while (attempts < 3) {
    try {
      const llmToUse = getClassifierLLM(
        attempts === 0 ? 0 : attempts === 1 ? 0.4 : 0.7,
      );
      const llmWithStructuredOutput = llmToUse.withStructuredOutput(
        ClassifyResponseSchema,
        {
          name: "ClassifyResponse",
        },
      );

      const parsed = await llmWithStructuredOutput.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt + retryFeedback),
      ]);

      console.log(
        `[LLM][ClassifyResponse] intent="${parsed.intent}" confidence="${parsed.confidence}"`,
      );

      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
      };
    } catch (error) {
      attempts++;
      console.error(
        `[LLM][ClassifyResponse] Attempt ${attempts} failed to parse output: ${error}`,
      );
      if (attempts >= 3) {
        console.error(
          `[LLM][ClassifyResponse] Max retries reached. Defaulting to response.`,
        );
        return {
          intent: "response",
          confidence: 0.5,
        };
      }
      retryFeedback = `\n\nCRITICAL NOTIFICATION: Your previous output failed to parse as valid JSON. Error: ${error}. You MUST fix the formatting and return ONLY valid JSON. Do NOT include markdown blocks or trailing text.`;
    }
  }

  return { intent: "response", confidence: 0.5 };
}

/**
 * Invokes the LLM to evaluate whether an answer sufficiently responds to a question.
 */
export async function evaluateAnswer(
  question: string,
  conversationHistory: string,
  followUpAttempts: number = 0,
  taskContext: string = "",
  evaluationPrompt?: string,
): Promise<AnswerEvaluation> {
  const contextSection = taskContext
    ? `CONTEXT FROM PREVIOUS ACTIONS IN THIS TASK:\n${taskContext}\n\n`
    : "";

  const methodologyContext = evaluationPrompt
    ? `METHODOLOGY / EVALUATION GUIDELINES:\n${evaluationPrompt}`
    : "METHODOLOGY: Standard Interview. Be permissive: if the user provides a clear response or states that the concept does not exist, mark it as 'sufficient'. Avoid unnecessary follow-ups for minor details unless operational depth is explicitly requested.";

  const systemPrompt =
    "You are an evaluator for interview answers.\n\n" +
    `${methodologyContext}\n\n` +
    "Determine both the quality of the answer and what the interviewer should do next.\n\n" +
    "CRITICAL: You must ALWAYS return a valid JSON object. Do not use markdown code blocks (like ```json). Do not include nested JSON objects inside strings.\n" +
    'The JSON object MUST have EXACTLY these keys: "explicacion_evaluacion" (string), "verdict" ("sufficient" or "insufficient"), "confidence" (number between 0.0 and 1.0), and "nextStep" ("stop" or "ask_follow_up").\n\n' +
    "Rules:\n" +
    '- Mark "sufficient" when the answer provides useful operational detail OR clearly states that the process/tool/practice does not exist.\n' +
    '- Check the "CONTEXT FROM PREVIOUS ACTIONS" section to see if the missing information in the current answer was already provided in earlier related questions of the same task.\n' +
    '- Mark "insufficient" ONLY when the answer is vague, generic, or non-responsive AND the missing information has NOT been provided in previous actions context.\n' +
    '- Use "nextStep":"ask_follow_up" only when the answer seems recoverable and a concise follow-up could reasonably obtain the missing information.\n' +
    '- Use "nextStep":"stop" when the answer is already sufficient or when pushing further is unlikely to add value.\n' +
    '- A short but definitive "no" can justify "nextStep":"stop" if it clearly means there is nothing else to extract.\n' +
    '- If there have already been multiple follow-up attempts and the answer is still vague or empty, prefer "nextStep":"stop".';

  const userPrompt =
    `${contextSection}` +
    `Original Question: ${question}\n\n` +
    `Conversation History:\n${conversationHistory}\n\n` +
    `Follow-up attempts already made: ${followUpAttempts}`;

  console.log(`[LLM][EvaluateAnswer] question="${question}"`);
  console.log(
    `[LLM][EvaluateAnswer] conversationHistory="${conversationHistory}"`,
  );
  console.log(`[LLM][EvaluateAnswer] followUpAttempts="${followUpAttempts}"`);

  let attempts = 0;
  let retryFeedback = "";
  while (attempts < 3) {
    try {
      const llmToUse = getClassifierLLM(
        attempts === 0 ? 0 : attempts === 1 ? 0.4 : 0.7,
      );
      const llmWithStructuredOutput = llmToUse.withStructuredOutput(
        EvaluateAnswerSchema,
        {
          name: "EvaluateAnswer",
        },
      );

      const parsed = await llmWithStructuredOutput.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt + retryFeedback),
      ]);

      let verdict = parsed.verdict;
      let nextStep = parsed.nextStep;

      // Business logic overrides
      if (verdict === "sufficient") {
        nextStep = "stop";
      } else if (followUpAttempts >= MAX_FOLLOW_UP_ATTEMPTS) {
        nextStep = "stop";
      }

      console.log(
        `[LLM][EvaluateAnswer] verdict="${verdict}" confidence="${parsed.confidence}" nextStep="${nextStep}" followUpAttempts="${followUpAttempts}"`,
      );

      return {
        verdict,
        confidence: parsed.confidence,
        nextStep,
      };
    } catch (error) {
      attempts++;
      console.error(
        `[LLM][EvaluateAnswer] Attempt ${attempts} failed to parse output: ${error}`,
      );
      if (attempts >= 3) {
        console.error(
          `[LLM][EvaluateAnswer] Max retries reached. Defaulting to insufficient/stop.`,
        );
        return {
          verdict: "insufficient",
          confidence: 0.5,
          nextStep: "stop",
        };
      }
      retryFeedback = `\n\nCRITICAL NOTIFICATION: Your previous output failed to parse as valid JSON. Error: ${error}. You MUST fix the formatting and return ONLY valid JSON. Do NOT include markdown blocks or trailing text.`;
    }
  }

  return { verdict: "insufficient", confidence: 0.5, nextStep: "stop" };
}

/**
 * Invokes the LLM to clarify a user's doubt.
 */
export async function clarifyDoubt(response: string): Promise<string> {
  const systemPrompt =
    "You are a neutral knowledge management expert. Provide a VERY CONCISE technical explanation (max 2-3 sentences). Do not use tables, long lists, or first-person examples. Focus on the core definition so the user can apply it to their case. Always respond in the same language as the input.\nCRITICAL: You must ALWAYS return a valid JSON object. It MUST have EXACTLY the key \"explicacion\" (string) containing your explanation.";
  const userPrompt = `User doubt: "${response}"\n\nProvide a brief clarification.`;

  const llmWithStructure = llm.withStructuredOutput(ClarifyDoubtSchema);
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      if (attempts > 0) {
        console.log(
          `🟢 [RECOVERED] [LLM::ClarifyDoubt] Aclaración generada con éxito en el intento ${attempts + 1}/3.`,
        );
      }
      return result.explicacion;
    } catch (e: any) {
      attempts++;
      if (attempts >= 3) {
        console.error(
          `🚨 [ERROR] [LLM::ClarifyDoubt] Agotados los 3 reintentos: ${e?.message || e}. Aplicando respuesta de respaldo.`,
        );
        return "Por favor, intente explicar su duda de otra forma.";
      }
      console.warn(
        `⚠️ [RETRY] [LLM::ClarifyDoubt] Intento ${attempts}/3 falló: ${e?.message || e}. Reintentando...`,
      );
    }
  }
  return "";
}

/**
 * Invokes the LLM to rewrite a question based on previous attempts.
 */
export async function rewriteQuestion(
  question: string,
  previousAttempts: string[] = [],
): Promise<string> {
  const systemPrompt =
    'You are an expert at reformulating questions. Return ONLY the rewritten question, making it direct and simple. No preambles. Always respond in the same language as the original question.\nCRITICAL: You must ALWAYS return a valid JSON object. It MUST have EXACTLY the key "rewritten_question" (string) containing the reformulated question.';
  const previousContext =
    previousAttempts.length > 0
      ? `\nPrevious attempts: ${previousAttempts.join(", ")}`
      : "";
  const userPrompt = `Original question: ${question}${previousContext}\n\nRewrite this question to be more specific and actionable.`;

  const llmWithStructure = llm.withStructuredOutput(RewriteQuestionSchema);
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      if (attempts > 0) {
        console.log(
          `🟢 [RECOVERED] [LLM::RewriteQuestion] Pregunta reformulada con éxito en el intento ${attempts + 1}/3.`,
        );
      }
      return result.rewritten_question.trim();
    } catch (e: any) {
      attempts++;
      if (attempts >= 3) {
        console.error(
          `🚨 [ERROR] [LLM::RewriteQuestion] Agotados los 3 reintentos: ${e?.message || e}. Manteniendo pregunta original.`,
        );
        return question;
      }
      console.warn(
        `⚠️ [RETRY] [LLM::RewriteQuestion] Intento ${attempts}/3 falló: ${e?.message || e}. Reintentando...`,
      );
    }
  }
  return question;
}

/**
 * Invokes the LLM to merge clarification with original question.
 */
export async function mergeClarificationWithQuestion(
  question: string,
  clarification: string,
): Promise<string> {
  const systemPrompt =
    'You are a professional interviewer. Deliver a BRIEF expert explanation and immediately re-ask the original question. CRITICAL: Use a single, natural, and SHORT paragraph. Address the user directly as \'you\' (or \'usted/tú\'). DO NOT explain your reasoning. Just clarify and ask. Always respond in the same language as the input.\nCRITICAL: You must ALWAYS return a valid JSON object. It MUST have EXACTLY the key "merged_text" (string) containing your response.';
  const userPrompt = `Original question: "${question}"\n\nExplanation to deliver: "${clarification}"\n\nAs the interviewer, provide the brief explanation and re-ask the question in a single short paragraph.`;

  const llmWithStructure = llm.withStructuredOutput(MergeClarificationSchema);
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      if (attempts > 0) {
        console.log(
          `🟢 [RECOVERED] [LLM::MergeClarification] Aclaración combinada con éxito en el intento ${attempts + 1}/3.`,
        );
      }
      return result.merged_text.trim();
    } catch (e: any) {
      attempts++;
      if (attempts >= 3) {
        console.error(
          `🚨 [ERROR] [LLM::MergeClarification] Agotados los 3 reintentos: ${e?.message || e}. Usando texto concatenado por defecto.`,
        );
        return `${clarification}\n\n${question}`;
      }
      console.warn(
        `⚠️ [RETRY] [LLM::MergeClarification] Intento ${attempts}/3 falló: ${e?.message || e}. Reintentando...`,
      );
    }
  }
  return question;
}

/**
 * Invokes the LLM to generate a concise follow-up question.
 */
export async function generateInsufficientFollowUp(
  question: string,
  conversationHistory: string,
  taskContext: string = "",
): Promise<string> {
  const contextSection = taskContext
    ? `CONTEXT FROM PREVIOUS ACTIONS IN THIS TASK:\n${taskContext}\n\n`
    : "";

  const systemPrompt =
    "You are a concise interviewer. Identify ONE key missing detail and ask a single direct follow-up question.\n" +
    "CRITICAL RULES:\n" +
    "- Check the 'CONTEXT FROM PREVIOUS ACTIONS' section before asking. DO NOT ask for information already provided in those previous summaries.\n" +
    '- CRITICAL: You must ALWAYS return a valid JSON object. It MUST have EXACTLY these keys: "razonamiento_seguimiento" (string, explain what is missing) and "question" (string, the direct follow-up question).';

  const userPrompt =
    `${contextSection}` +
    `Original Question: ${question}\n\n` +
    `Conversation History:\n${conversationHistory}\n\n` +
    `Ask a single concise follow-up question.`;

  console.log(`[LLM][FollowUpQuestion] question="${question}"`);

  const llmWithStructure = llm.withStructuredOutput(FollowUpSchema, {
    name: "GenerateFollowUp",
  });

  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      console.log(`[LLM][FollowUpQuestion] question="${result.question}"`);
      return result.question.trim();
    } catch (e) {
      attempts++;
      if (attempts >= 3) return "¿Podría detallar un poco más su respuesta?";
    }
  }
  return "¿Podría dar más información?";
}

/**
 * Invokes the LLM to summarize the results of a task.
 */
export async function summarizeTask(
  taskName: string,
  qaPairs: Array<{ question: string; answer: string }>,
): Promise<string> {
  const systemPrompt =
    'You are a concise summarizer. Return ONLY a short summary of the task results. Always respond in the same language as the input questions and answers.\nCRITICAL: You must ALWAYS return a valid JSON object with EXACTLY the key "summary" (string).';
  const formatted = qaPairs
    .map(
      (pair, index) =>
        `Q${index + 1}: ${pair.question}\nA${index + 1}: ${pair.answer}`,
    )
    .join("\n\n");
  const userPrompt = `Task: ${taskName}\n\n${formatted}\n\nProvide a concise summary of the task results.`;

  const llmWithStructure = getReasonerLLM().withStructuredOutput(
    SummarizeTaskSchema,
  );
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      return result.summary.trim();
    } catch (e) {
      attempts++;
      if (attempts >= 3)
        return "Resumen no disponible debido a un error del modelo.";
    }
  }
  return "";
}

/**
 * Invokes the LLM to synthesize a coherent answer from multiple QA turns.
 */
export async function summarizeActionAnswer(
  originalQuestion: string,
  qaTurns: Array<{ question: string; answer: string }>,
  completeAnswer: string,
): Promise<string> {
  const systemPrompt =
    "You are a core message synthesizer for a business assessment. Your task is to extract only the FACTS and STATEMENTS directly provided by the user in the interview turns. \n" +
    "CRITICAL RULES:\n" +
    "- DO NOT ADD ANY INFORMATION not explicitly mentioned in the answers (no 'future strategies' or 'potential plans' unless the user said them).\n" +
    "- Use a professional and neutral tone.\n" +
    "- Return ONLY the final paragraph in the same language as the input.\n" +
    '- CRITICAL: You must ALWAYS return a valid JSON object. It MUST have EXACTLY the key "summary" (string) containing your paragraph.';
  const formattedTurns = qaTurns
    .map(
      (turn, index) =>
        `Turn ${index + 1}\nQ: ${turn.question}\nA: ${turn.answer}`,
    )
    .join("\n\n");
  const userPrompt = `Original question:\n${originalQuestion}\n\nInterview turns:\n${formattedTurns}\n\nConcatenated answer:\n${completeAnswer}\n\nCreate a coherent summary paragraph that preserves concrete details and avoids repetition.`;

  const llmWithStructure = getReasonerLLM().withStructuredOutput(
    SummarizeActionSchema,
  );
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      return result.summary.trim();
    } catch (e) {
      attempts++;
      if (attempts >= 3) return completeAnswer.trim();
    }
  }
  return completeAnswer.trim();
}

/**
 * Invokes the LLM to deduce answers from previous summaries.
 */
export async function extractAnswerFromSummaries(
  summaryContext: string,
  newQuestion: string,
): Promise<string> {
  const systemPrompt =
    "You are an expert business analyst and interview synthesizer. Your task is to determine if a new question can be FULLY AND LOGICALLY DEDUCED from the provided summaries of past conversation turns.\n\n" +
    "CRITICAL RULES:\n" +
    "1. COMPLETE, SELF-CONTAINED ANSWER: If and only if the summaries contain enough concrete facts to answer the question, set `can_be_deduced: true` and provide a complete, well-reasoned statement that explicitly mentions the facts (e.g., 'Al tratarse de una microempresa unipersonal sin empleados, no aplican comités de formación ni evaluaciones 360, sino que la dueña gestiona todo de forma directa.').\n" +
    "2. CANNOT BE DEDUCED: If the summaries do NOT contain explicit facts answering the question, set `can_be_deduced: false` and set `answer: \"\"`.\n" +
    "3. NEVER META-COMMENTARY: NEVER return meta-commentary like 'No se puede deducir...', 'Los resúmenes no mencionan...', 'No hay suficiente información...'. If it cannot be deduced, `answer` MUST be an empty string `\"\"`.\n" +
    "4. NO SHALLOW OR ONE-WORD ANSWERS: NEVER return bare words like 'Sí', 'No', 'No aplica', or vague fragments. If you cannot produce a complete, informative response backed by facts, set `can_be_deduced: false` and `answer: \"\"`.\n" +
    "5. SAME LANGUAGE: Always respond in the same language as the question (usually Spanish).\n" +
    "6. JSON FORMAT: You must ALWAYS return a valid JSON object with `can_be_deduced` (boolean) and `answer` (string).";
  const userPrompt = `Summaries:\n${summaryContext}\n\nQuestion:\n${newQuestion}\n\nExtracted/Deduced Answer:`;
  let attempts = 0;
  let retryFeedback = "";
  while (attempts < 3) {
    try {
      const llmToUse = getClassifierLLM(
        attempts === 0 ? 0 : attempts === 1 ? 0.3 : 0.7,
      );
      const llmWithStructure = llmToUse.withStructuredOutput(
        ExtractAnswerSchema,
        {
          name: "ExtractAnswer",
        },
      );

      const result = await llmWithStructure.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt + retryFeedback),
      ]);

      if (!result?.can_be_deduced) {
        return "";
      }

      const ans = (result?.answer || "").trim();
      const normalized = ans.toLowerCase();

      // Guardrails against meta-commentary or trivial responses
      if (
        !ans ||
        ans === "{}" ||
        ans === "[]" ||
        ans === '""' ||
        normalized.startsWith("no se puede deducir") ||
        normalized.startsWith("no es posible deducir") ||
        normalized.startsWith("no se menciona") ||
        normalized.startsWith("no hay información") ||
        normalized.startsWith("no hay suficiente") ||
        normalized.startsWith("los resúmenes no") ||
        normalized.startsWith("el resumen no") ||
        normalized === "n/a" ||
        normalized === "none" ||
        normalized === "si" ||
        normalized === "sí" ||
        normalized === "no" ||
        normalized === "yes"
      ) {
        return "";
      }
      return ans;
    } catch (e) {
      attempts++;
      console.warn(
        `⚠️ [RETRY] [LLM::ExtractAnswer] Intento ${attempts}/3 falló: ${e}. Reintentando...`,
      );
      retryFeedback = `\n\nCRITICAL NOTIFICATION: Your previous output failed to conform to the required JSON schema. You MUST return a valid JSON object matching the schema with 'can_be_deduced' (boolean) and 'answer' (string).`;
      if (attempts >= 3) {
        console.error(`[LLM][ExtractAnswer] Error agotados los 3 reintentos:`, e);
        return "";
      }
    }
  }
  return "";
}

/**
 * Invokes the LLM to perform internal reasoning.
 */
export async function executeInternalReasoning(
  systemPrompt: string,
  userPrompt: string,
  outputSchema?: Record<string, any>,
): Promise<string> {
  console.log(`[LLM][InternalReasoning] userPromptLength=${userPrompt.length}`);

  if (outputSchema) {
    console.log(`[LLM][InternalReasoning] Using structured output with schema`);
    let attempts = 0;
    let retryFeedback = "";
    const internalMaxTokens = parseInt(process.env.INTERNAL_MAX_TOKENS || "16384", 10);
    const internalTimeout = parseInt(process.env.INTERNAL_TIMEOUT_MS || "600000", 10);

    while (attempts < 3) {
      try {
        const llmToUse = getReasonerLLM(
          attempts === 0 ? 0 : attempts === 1 ? 0.4 : 0.7,
          internalMaxTokens,
          internalTimeout,
        );
        const llmWithStructure = llmToUse.withStructuredOutput(outputSchema, {
          name: "internal_action",
        });
        const result = await llmWithStructure.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(userPrompt + retryFeedback),
        ]);
        if (attempts > 0) {
          console.log(
            `🟢 [RECUPERADO CON ÉXITO] [LLM][InternalReasoning] Acción interna corregida y completada en el intento ${attempts + 1}/3.`,
          );
        }
        return JSON.stringify(result);
      } catch (e) {
        attempts++;
        console.error(
          `⚠️ [LLM][InternalReasoning] Intento ${attempts}/3 falló: ${e}`,
        );
        if (attempts >= 3) {
          console.error(
            `🚨 [FALLO DEFINITIVO EN CAMPO] [LLM][InternalReasoning] AGOTADOS LOS 3 REINTENTOS. NO SE PUDO GENERAR EL CAMPO ESTRUCTURADO. GUARDANDO VALOR VACÍO "{}" EN OUTPUTJSON.`,
          );
          return JSON.stringify({});
        }
        retryFeedback = `\n\nCRITICAL NOTIFICATION: Your previous output failed to parse as valid JSON. Error: ${e}. You MUST fix the formatting and return ONLY valid JSON matching the schema.`;
      }
    }
  }

  const result = await getReasonerLLM().invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  const content =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);

  try {
    const parsed = JSON.parse(content);

    if (parsed && typeof parsed === "object" && "resultado_json" in parsed) {
      const payload = (parsed as { resultado_json: unknown }).resultado_json;
      return typeof payload === "string"
        ? payload.trim()
        : JSON.stringify(payload);
    }

    return typeof parsed === "string" ? parsed.trim() : JSON.stringify(parsed);
  } catch {
    return content.trim();
  }
}

/**
 * Generates an executive process summary.
 */
export async function generateProcessSummary(
  processName: string,
  taskSummaries: Record<string, string>,
): Promise<string> {
  const reasoner = getReasonerLLM();
  const summaryEntries = Object.entries(taskSummaries)
    .map(([task, summary]) => `Tarea: ${task}\nResumen: ${summary}`)
    .join("\n\n");

  const prompt = `Eres un arquitecto de software y analista de negocio. Acabas de finalizar el proceso: "${processName}".
A continuación, se presentan los resúmenes de las tareas ejecutadas en este proceso:

${summaryEntries}

Tu objetivo es generar un "Resumen Ejecutivo de Proceso" conciso y directo que sirva de contexto para el siguiente proceso en la cadena.
Destaca los puntos clave, los hallazgos principales, y cualquier información cualitativa importante aportada por el stakeholder.
Ignora detalles puramente conversacionales. El resultado debe ser texto claro y altamente informativo.`;

  const messages = [new SystemMessage(prompt)];
  const response = await reasoner.invoke(messages);
  return response.content as string;
}
