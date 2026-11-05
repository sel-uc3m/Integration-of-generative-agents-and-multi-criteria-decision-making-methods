import { OllamaEmbeddings } from "@langchain/ollama";
import { MatchingResult, SoftFieldMetrics } from "./types.js";
import { SipacBatchMatchingSchema, SipacFieldMatchingOutput } from "./schemas.js";
import { buildSipacBatchMatchingPrompt, SipacFieldType } from "./prompts.js";
import { EVAL_CONFIG, invokeStructuredJudge } from "./config.js";

// ==========================================
// 1. Matriz de Similitud Vectorial y Léxica
// ==========================================

export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
}

export function magnitude(a: number[]): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

export function fallbackNgramSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const setA = new Set(normA.split(/\s+/));
  const setB = new Set(normB.split(/\s+/));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export async function calculateCosineSimilarity(textA: string, textB: string): Promise<number> {
  try {
    const embeddings = new OllamaEmbeddings({
      model: EVAL_CONFIG.defaultEmbeddingModel,
      baseUrl: EVAL_CONFIG.ollamaBaseUrl,
    });
    const [vecA, vecB] = await embeddings.embedDocuments([textA, textB]);
    const magA = magnitude(vecA);
    const magB = magnitude(vecB);
    return magA > 0 && magB > 0 ? dotProduct(vecA, vecB) / (magA * magB) : 0;
  } catch {
    return fallbackNgramSimilarity(textA, textB);
  }
}

export async function calculateBatchCosineSimilarity(
  agentItems: string[],
  groundTruthItems: string[]
): Promise<number[][]> {
  const m = agentItems.length;
  const n = groundTruthItems.length;
  if (m === 0 || n === 0) return [];

  let vectors: number[][] = [];
  try {
    const embeddings = new OllamaEmbeddings({
      model: EVAL_CONFIG.defaultEmbeddingModel,
      baseUrl: EVAL_CONFIG.ollamaBaseUrl,
    });
    vectors = await embeddings.embedDocuments([...agentItems, ...groundTruthItems]);
  } catch {
    const matrix: number[][] = Array.from({ length: m }, () => Array(n).fill(0.0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] = fallbackNgramSimilarity(agentItems[i], groundTruthItems[j]);
      }
    }
    return matrix;
  }

  const agentVecs = vectors.slice(0, m);
  const gtVecs = vectors.slice(m);
  const matrix: number[][] = [];

  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    const magA = magnitude(agentVecs[i]);
    for (let j = 0; j < n; j++) {
      const magB = magnitude(gtVecs[j]);
      const sim = magA > 0 && magB > 0 ? dotProduct(agentVecs[i], gtVecs[j]) / (magA * magB) : 0;
      row.push(isNaN(sim) ? 0.0 : sim);
    }
    matrix.push(row);
  }

  return matrix;
}

// ==========================================
// 2. Asignación Óptima 1-a-1 (Bipartite)
// ==========================================

export function solveBipartiteMatching(scoreMatrix: number[][]): Array<[number, number]> {
  const m = scoreMatrix.length;
  if (m === 0) return [];
  const n = scoreMatrix[0].length;
  if (n === 0) return [];

  const candidates: Array<{ i: number; j: number; score: number }> = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      candidates.push({ i, j, score: scoreMatrix[i][j] });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const usedI = new Set<number>();
  const usedJ = new Set<number>();
  const matches: Array<[number, number]> = [];

  for (const cand of candidates) {
    if (!usedI.has(cand.i) && !usedJ.has(cand.j) && cand.score > 0) {
      usedI.add(cand.i);
      usedJ.add(cand.j);
      matches.push([cand.i, cand.j]);
    }
  }

  return matches;
}

// ==========================================
// 3. Juez LLM Batch y Soft Matching
// ==========================================

export async function evaluateSipacCandidatePairsBatch(
  pairs: Array<{ id: number; agentItem: string; groundTruthItem: string }>,
  fieldType: SipacFieldType,
  contextInfo: string,
  batchSize = EVAL_CONFIG.batchSize.sipacMatching
): Promise<Map<number, SipacFieldMatchingOutput>> {
  const results = new Map<number, SipacFieldMatchingOutput>();
  if (pairs.length === 0) return results;

  for (let offset = 0; offset < pairs.length; offset += batchSize) {
    const chunk = pairs.slice(offset, offset + batchSize);
    const prompt = buildSipacBatchMatchingPrompt({ fieldType, contextInfo, pairs: chunk });
    const batchDesc =
      pairs.length > batchSize
        ? `Juez SIPAC [${fieldType} Lote ${Math.floor(offset / batchSize) + 1}/${Math.ceil(pairs.length / batchSize)}]`
        : `Juez SIPAC [${fieldType}] (${chunk.length} parejas)`;

    try {
      const batchOutput = await invokeStructuredJudge({
        schema: SipacBatchMatchingSchema,
        prompt,
        description: batchDesc,
        preprocessor: (parsed) => {
          if (Array.isArray(parsed)) return { evaluations: parsed };
          if (parsed && typeof parsed === "object") {
            const evals = parsed.evaluations || parsed.evals || parsed.results || parsed.pairs;
            if (Array.isArray(evals)) return { evaluations: evals };
          }
          return parsed;
        },
      });

      for (const item of batchOutput.evaluations) {
        results.set(item.pairId, {
          score: item.score,
          reasoning: item.reasoning || `Puntuación asignada según rúbrica de ${fieldType}`,
        });
      }
    } catch (e) {
      console.warn(`⚠️ [Judge SIPAC] Fallaron los reintentos para el lote de ${fieldType}:`, e);
    }

    for (const pair of chunk) {
      if (!results.has(pair.id)) {
        results.set(pair.id, {
          score: 0,
          reasoning: "Fallback score due to evaluation execution failure.",
        });
      }
    }
  }

  return results;
}

export async function evaluateFieldMatching(
  agentItems: string[],
  groundTruthItems: string[],
  fieldType: SipacFieldType,
  companyName: string,
  tauStar = EVAL_CONFIG.tauStar
): Promise<SoftFieldMetrics> {
  const m = agentItems.length;
  const n = groundTruthItems.length;

  if (m === 0 && n === 0) return { precision: 1.0, recall: 1.0, f1: 1.0, matchedPairs: [] };
  if (m === 0 || n === 0) return { precision: 0.0, recall: 0.0, f1: 0.0, matchedPairs: [] };

  // 1. Matriz de similitud coseno (m x n)
  const cosineMatrix = await calculateBatchCosineSimilarity(agentItems, groundTruthItems);

  // 2. Filtrado con umbral tau*
  const candidatePairs: Array<{ id: number; agentItem: string; groundTruthItem: string; i: number; j: number }> = [];
  let pairIdCounter = 1;

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const cos = cosineMatrix[i]?.[j] ?? 0.0;
      if (cos >= tauStar) {
        candidatePairs.push({
          id: pairIdCounter++,
          agentItem: agentItems[i],
          groundTruthItem: groundTruthItems[j],
          i,
          j,
        });
      }
    }
  }

  // 3. Evaluación en lote con Juez LLM
  const evaluatedMap = await evaluateSipacCandidatePairsBatch(
    candidatePairs.map((p) => ({ id: p.id, agentItem: p.agentItem, groundTruthItem: p.groundTruthItem })),
    fieldType,
    `Empresa: ${companyName}`
  );

  const scoreMatrix: number[][] = Array.from({ length: m }, () => Array(n).fill(0.0));
  const candidateMapByCoords = new Map<
    string,
    { score: number; normalizedScore: number; reasoning: string; evaluatedByLLM: boolean }
  >();

  for (const pair of candidatePairs) {
    const evalRes = evaluatedMap.get(pair.id) || { score: 0, reasoning: "Fallback score" };
    const normalizedScore = evalRes.score / 3.0;
    scoreMatrix[pair.i][pair.j] = normalizedScore;
    candidateMapByCoords.set(`${pair.i}_${pair.j}`, {
      score: evalRes.score,
      normalizedScore,
      reasoning: evalRes.reasoning,
      evaluatedByLLM: true,
    });
  }

  // 4. Asignación óptima 1-a-1
  const matches = solveBipartiteMatching(scoreMatrix);
  let totalMatchedScore = 0;
  const matchedPairs: MatchingResult[] = [];
  const matchedAgentIndices = new Set<number>();

  for (const [i, j] of matches) {
    const normScore = scoreMatrix[i][j];
    if (normScore > 0) {
      totalMatchedScore += normScore;
      matchedAgentIndices.add(i);
      const evalInfo = candidateMapByCoords.get(`${i}_${j}`);
      matchedPairs.push({
        agentItem: agentItems[i],
        matchedGroundTruthItem: groundTruthItems[j],
        cosineSimilarity: cosineMatrix[i]?.[j] ?? 0.0,
        score: evalInfo?.score ?? 0,
        normalizedScore: normScore,
        reasoning: evalInfo?.reasoning || "Emparejado por asignación óptima",
        evaluatedByLLM: evalInfo?.evaluatedByLLM ?? false,
      });
    }
  }

  for (let i = 0; i < m; i++) {
    if (!matchedAgentIndices.has(i)) {
      matchedPairs.push({
        agentItem: agentItems[i],
        matchedGroundTruthItem: null,
        cosineSimilarity: 0.0,
        score: 0,
        normalizedScore: 0.0,
        reasoning: "Sin correspondencia semántica válida en el Ground Truth",
        evaluatedByLLM: false,
      });
    }
  }

  // 5. Métricas ponderadas
  const precision = totalMatchedScore / m;
  const recall = totalMatchedScore / n;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
    f1: Number(f1.toFixed(3)),
    matchedPairs,
  };
}
