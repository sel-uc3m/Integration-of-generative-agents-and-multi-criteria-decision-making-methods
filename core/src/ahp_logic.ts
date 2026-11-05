export interface AhpMatrix {
  name: string;
  matrix: number[][]; // nxn pairwise comparison matrix
}

export interface AhpComparison {
  item_a: string;
  item_b: string;
  ganador: string;
  peso_saaty: number;
}

export interface AhpResult {
  weights: number[];
  lambdaMax: number;
  consistencyIndex: number;
  consistencyRatio: number;
  isConsistent: boolean;
}

/**
 * Builds an nxn pairwise comparison matrix from pairwise comparison records.
 */
export function buildAhpMatrix(items: string[], comparisons: AhpComparison[]): number[][] {
  const n = items.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(1));

  // 1. Precomputar mapa de índices normalizados O(N) una sola vez
  const itemIndexMap = new Map<string, number>();
  items.forEach((item, index) => {
    itemIndexMap.set(item.toLowerCase().trim(), index);
  });

  // 2. Procesar comparaciones con búsquedas instantáneas O(1)
  for (const comp of comparisons) {
    const itemA = comp.item_a.toLowerCase().trim();
    const itemB = comp.item_b.toLowerCase().trim();

    const idxA = itemIndexMap.get(itemA);
    const idxB = itemIndexMap.get(itemB);

    if (idxA === undefined || idxB === undefined) {
      console.warn(`[Warning] Could not find items in comparison: ${comp.item_a} vs ${comp.item_b}`);
      continue;
    }

    if (idxA === idxB) continue;

    let scoreA = 1;
    let scoreB = 1;

    const ganador = comp.ganador.toLowerCase().trim();

    if (ganador === "empate") {
      scoreA = 1;
      scoreB = 1;
    } else if (ganador === itemA) {
      scoreA = comp.peso_saaty;
      scoreB = 1 / comp.peso_saaty;
    } else if (ganador === itemB) {
      scoreA = 1 / comp.peso_saaty;
      scoreB = comp.peso_saaty;
    } else {
      // Substring matching heuristic
      if (ganador.includes(itemA)) {
        scoreA = comp.peso_saaty;
        scoreB = 1 / comp.peso_saaty;
      } else if (ganador.includes(itemB)) {
        scoreA = 1 / comp.peso_saaty;
        scoreB = comp.peso_saaty;
      }
    }

    matrix[idxA][idxB] = scoreA;
    matrix[idxB][idxA] = scoreB;
  }

  return matrix;
}

const RI_TABLE: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

export function calcAhp(matrix: number[][]): AhpResult {
  const n = matrix.length;
  if (n === 0) throw new Error("Empty matrix");

  // 1. Column sums
  const colSums = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      colSums[j] += matrix[i][j];
    }
  }

  // 2. Normalize matrix & compute priority vector (weights)
  const weights = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      weights[i] += (matrix[i][j] / colSums[j]);
    }
    weights[i] /= n;
  }

  // 3. Compute Lambda Max
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] * weights[j];
    }
    lambdaMax += rowSum / weights[i];
  }
  lambdaMax /= n;

  // 4. Consistency
  const CI = (lambdaMax - n) / (n - 1) || 0; // Handle n=1
  const RI = RI_TABLE[n] || 1.49; 
  const CR = n <= 2 ? 0 : CI / RI;

  // Limits from the Excel: n=3 -> 0.05, n=4 -> 0.09, n>=5 -> 0.1
  let threshold = 0.1;
  if (n === 3) threshold = 0.05;
  if (n === 4) threshold = 0.09;

  return {
    weights,
    lambdaMax,
    consistencyIndex: CI,
    consistencyRatio: CR,
    isConsistent: CR <= threshold
  };
}

export function rankAlternatives(
  criteriaMatrix: number[][],
  alternativeMatrices: number[][][]
) {
  const criteriaResult = calcAhp(criteriaMatrix);
  
  const altResults = alternativeMatrices.map(mat => calcAhp(mat));
  const numAlts = altResults[0].weights.length;
  const numCriteria = criteriaResult.weights.length;

  const finalWeights = new Array(numAlts).fill(0);
  for (let i = 0; i < numAlts; i++) {
    for (let j = 0; j < numCriteria; j++) {
      finalWeights[i] += altResults[j].weights[i] * criteriaResult.weights[j];
    }
  }

  return {
    criteriaResult,
    altResults,
    finalWeights
  };
}
