export type SipacFieldType = "GIA" | "ACTIVO_INTANGIBLE" | "INTELLECTUS_CI" | "ARTEFACTO" | "INDICADOR";

export const SIPAC_FIELD_RUBRICS: Record<SipacFieldType, string> = {
  GIA: `[Rúbrica GIA] (Estricta - Categoría Taxonómica)
- 0: Grupo de Activo Intangible completamente incorrecto o ajeno al proceso.
- 1: Mismo dominio general del modelo pero GIA específico incorrecto.
- 2: (No aplicable en rúbrica estricta).
- 3: GIA correcto o equivalente directo.`,

  ACTIVO_INTANGIBLE: `[Rúbrica ACTIVO_INTANGIBLE] (Moderada - Conocimiento/Capacidad Específica)
- 0: Activo Intangible sin relación con la necesidad operacional del proceso.
- 1: Activo Intangible vago o genérico.
- 2: Activo Intangible funcionalmente equivalente (misma capacidad formulada con otros términos).
- 3: Activo Intangible idéntico o sinónimo directo del esperado.`,

  INTELLECTUS_CI: `[Rúbrica INTELLECTUS_CI] (Estricta - Clasificación de Capital Intelectual)
- 0: Capital Intelectual erróneo (ej. clasificar Capital Humano como Capital Tecnológico).
- 1: Mismo bloque principal pero subcategoría imprecisa.
- 2: (No aplicable en rúbrica estricta).
- 3: Clasificación Intellectus exacta o equivalente directa.`,

  ARTEFACTO: `[Rúbrica ARTEFACTO] (Moderada - Solución Tecnológica/Documental)
- 0: Artefacto sin relación con la necesidad del activo intangible.
- 1: Artefacto del mismo dominio tecnológico pero con función diferente.
- 2: Artefacto funcionalmente equivalente (resuelve el mismo problema con otra tecnología).
- 3: Artefacto idéntico o sinónimo directo.`,

  INDICADOR: `[Rúbrica INDICADOR] (Laxa - Métrica/KPI)
- 0: Indicador que mide algo ajeno al objetivo del activo intangible.
- 1: Indicador del mismo ámbito pero que mide una dimensión diferente.
- 2: Indicador alternativo válido (mide la misma faceta con otra métrica aceptable).
- 3: Indicador idéntico o reformulación directa del esperado.`,
};

export function buildStakeholderPrompt(params: {
  companyName: string;
  companyFullContext: string;
  sessionTranscriptHistory: string;
  agentFollowupQuestion: string;
}): string {
  return `Eres el responsable/dueño de la empresa ${params.companyName}.
Tu conocimiento completo sobre la realidad de tu empresa proviene del siguiente dossier global:

<DOSSIER_GLOBAL_EMPRESA>
${params.companyFullContext}
</DOSSIER_GLOBAL_EMPRESA>

HISTORIAL COMPLETO DE LO HABLADO EN LA ENTREVISTA HASTA EL MOMENTO:
<HISTORIAL_LLAMADA>
${params.sessionTranscriptHistory}
</HISTORIAL_LLAMADA>

EL CONSULTOR AGÉNTICO TE HACE LA SIGUIENTE PREGUNTA DE SEGUIMIENTO:
"${params.agentFollowupQuestion}"

INSTRUCCIONES (Responde en JSON estricto con los campos \`isRedundant\`, \`response\` y \`reasoning\`):
1. REVISAR HISTORIAL_LLAMADA: Si la pregunta solicita información que YA LE DIJISTE en turnos o capacidades anteriores, marca \`isRedundant: true\` y en \`response\` indícale de forma natural que ya lo habíais comentado.
2. REVISAR DOSSIER_GLOBAL_EMPRESA: Si la información es NUEVA y no ha sido dicha en la entrevista, marca \`isRedundant: false\` y responde en tu voz natural proporcionando ÚNICAMENTE el detalle específico solicitado. No reveles todo el dossier de golpe.
3. En \`reasoning\` incluye una explicación breve del motivo de tu respuesta.

Ejemplo de salida JSON esperada:
{
  "isRedundant": false,
  "response": "Texto en primera persona...",
  "reasoning": "Explicación interna..."
}`;
}

export const ALTUS_FOLLOW_UP_RUBRIC = `[RÚBRICA DE CALIDAD DE PREGUNTAS DE SEGUIMIENTO (FOLLOW-UP) EN HILO LOCAL]
- 0 puntos (Repetitiva / Bucle):
  * La repregunta es idéntica o paráfrasis directa de una pregunta ya formulada en este hilo de la capacidad.
  * O ignora completamente la respuesta previa del entrevistado, volviendo a preguntar por lo mismo sin justificación.
- 1 punto (Cuasi-redundante / Pregunta más o menos lo mismo / Sin avance):
  * Pregunta prácticamente lo mismo con variaciones cosméticas, sin aportar un nuevo ángulo ni profundizar en el diagnóstico.
  * O es una pregunta de relleno genérica (ej. "¿Puedes detallar más?", "¿Algo más que añadir?") que no ayuda a obtener el dato faltante para evaluar la madurez.
- 2 puntos (Específica / Dirigida):
  * Pregunta concreta y bien orientada a indagar en la información que falta para cumplir el propósito de la pregunta original de la capacidad.
- 3 puntos (Excelente / Progresiva con escucha activa):
  * Toma la respuesta dada por el usuario en el turno previo (demuestra escucha activa) y profundiza con precisión en la dimensión o evidencia técnica/organizativa que aún falta para completar el diagnóstico.`;

export function buildAltusFollowUpQualityPrompt(params: {
  capacityName: string;
  originalQuestion: string;
  capacityContext: string;
  localThreadHistory: string;
  agentFollowUpQuestion: string;
}): string {
  return `Eres un evaluador experto en técnicas de entrevista para diagnóstico de madurez digital.
Tu tarea es calificar la calidad de una PREGUNTA DE SEGUIMIENTO (follow-up) formulada por un consultor agéntico para profundizar en una capacidad específica.

CAPACIDAD A EVALUAR: ${params.capacityName}
PREGUNTA ORIGINAL DE LA CAPACIDAD: "${params.originalQuestion}"
CONTEXTO / CRITERIO DE MADUREZ:
${params.capacityContext}

HILO DE CONVERSACIÓN DE ESTA CAPACIDAD HASTA EL MOMENTO:
<HILO_LOCAL>
${params.localThreadHistory}
</HILO_LOCAL>

PREGUNTA DE SEGUIMIENTO A EVALUAR:
"${params.agentFollowUpQuestion}"

RÚBRICA DE EVALUACIÓN:
${ALTUS_FOLLOW_UP_RUBRIC}

Responde únicamente en formato JSON con los campos:
- \`score\`: entero (0, 1, 2 o 3) según la rúbrica.
- \`reasoning\`: justificación concisa del score asignado en base a la rúbrica y la evolución del hilo local.`;
}

export function buildSipacMatchingPrompt(params: {
  fieldType: SipacFieldType;
  contextInfo: string;
  agentItem: string;
  groundTruthItem: string;
}): string {
  const rubric = SIPAC_FIELD_RUBRICS[params.fieldType] || "";

  return `Eres un evaluador experto en la metodología SIPAC.
Tu tarea es calificar la similitud entre un elemento generado por una IA y un elemento de referencia (Ground Truth).

CAMPO EVALUADO: ${params.fieldType}
PROCESO / CONTEXTO RELEVANTE: ${params.contextInfo}

PROPUESTA DEL AGENTE:
"${params.agentItem}"

GROUND TRUTH DE REFERENCIA:
"${params.groundTruthItem}"

RÚBRICA DE EVALUACIÓN:
${rubric}

Responde únicamente en JSON con los campos \`score\` (0 a 3) y \`reasoning\`.`;
}

export function buildSipacBatchMatchingPrompt(params: {
  fieldType: SipacFieldType;
  contextInfo: string;
  pairs: Array<{ id: number; agentItem: string; groundTruthItem: string }>;
}): string {
  const rubric = SIPAC_FIELD_RUBRICS[params.fieldType] || "";
  const pairsList = params.pairs
    .map((p) => `[PAREJA #${p.id}]\n- Propuesta IA: "${p.agentItem}"\n- Ground Truth: "${p.groundTruthItem}"`)
    .join("\n\n");

  return `Eres un evaluador experto en la metodología SIPAC.
Tu tarea es calificar la similitud semántica de una lista de ${params.pairs.length} parejas candidatas entre elementos generados por una IA y elementos de referencia (Ground Truth).

CAMPO EVALUADO: ${params.fieldType}
PROCESO / CONTEXTO RELEVANTE: ${params.contextInfo}

RÚBRICA DE EVALUACIÓN:
${rubric}

LISTA DE PAREJAS A EVALUAR:
${pairsList}

INSTRUCCIONES:
1. Evalúa cada pareja individualmente asignando su \`pairId\`, un \`score\` entero (0 a 3 según la rúbrica) y un breve \`reasoning\`.
2. Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "evaluations": [
    { "pairId": 1, "score": 3, "reasoning": "..." }
  ]
}`;
}

export function buildAhpCriteriaPrompt(params: {
  companyContext: string;
  artefactsContext: string;
  proposedCriteriaList: string;
  pairwiseComparisonsList: string;
}): string {
  return `Eres un consultor senior experto en Toma de Decisiones Multicriterio (MCDM) y en el método Analytic Hierarchy Process (AHP) aplicado a la transformación digital de PYMEs.
Tu labor es evaluar la calidad del soporte a la decisión generado por un agente conversacional de IA durante la fase de preproyecto.

CONTEXTO REAL DE LA EMPRESA Y OBJETIVOS ESTRATÉGICOS (GROUND TRUTH):
${params.companyContext}

ARTEFACTOS TECNOLÓGICOS A PRIORIZAR PROCEDENTES DE SIPAC:
${params.artefactsContext}

PROPUESTA DE CRITERIOS GENERADA POR EL AGENTE (CON DESCRIPCIONES):
${params.proposedCriteriaList}

COMPARACIONES PAREADAS Y JUSTIFICACIONES DE NEGOCIO EMITIDAS POR EL AGENTE:
${params.pairwiseComparisonsList}

EVALÚA LA ASISTENCIA DEL AGENTE EN 4 DIMENSIONES (0, 1, 2 o 3 puntos cada una):

1. Relevancia y Adaptación Contextual (relevance):
   - 0: Criterios genéricos de plantilla, ajenos a la realidad o sector de la empresa.
   - 1: Criterios estándar aplicables a cualquier negocio, sin personalización a los procesos del caso.
   - 2: Criterios adaptados al sector y actividad de la PYME (ej. construcción, comercio textil, retail).
   - 3: Criterios hiper-específicos que capturan con precisión los dolores, restricciones operativas y objetivos estratégicos de la empresa.

2. No Solapamiento y Ortogonalidad (nonOverlap):
   - 0: Criterios redundantes o sinónimos directos que miden la misma faceta con distinto nombre.
   - 1: Fuerte solapamiento conceptual que infla artificialmente el peso de una dimensión.
   - 2: Criterios diferenciados con leve intersección de ámbito.
   - 3: Criterios estrictamente ortogonales e independientes (ej. Valor de Negocio vs Coste/TCO vs Facilidad de Adopción vs Plazo).

3. Completitud y Cobertura Holística (completeness):
   - 0: Omite dimensiones críticas de decisión (ej. evalúa solo coste ignorando impacto y viabilidad).
   - 1: Perspectiva sesgada hacia un único ángulo (ej. solo técnico o solo financiero).
   - 2: Cubre las facetas principales pero omite dimensiones relevantes como adopción, riesgo o plazos.
   - 3: Cobertura equilibrada y holística de valor estratégico, esfuerzo/coste, viabilidad operativa y adopción del personal.

4. Racionalidad de las Justificaciones Pareadas (justification):
   - 0: Sin justificaciones o basadas en tautologías vacías ("A gana a B porque es más importante").
   - 1: Justificaciones vagas o genéricas sin anclaje en el contexto de la empresa.
   - 2: Justificaciones lógicas y coherentes basadas en el funcionamiento general del sector.
   - 3: Argumentación estratégica profunda y contrastada que fundamenta la intensidad del juicio Saaty (1-9) conectando con los datos y restricciones del caso.

Responde estrictamente en formato JSON según el esquema AhpCriteriaEvaluationSchema.`;
}
