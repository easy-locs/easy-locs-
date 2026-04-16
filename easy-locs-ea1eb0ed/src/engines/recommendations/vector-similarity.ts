export interface EmbeddingVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length;
  }
  return result;
}

export function normalizeVector(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export function generateSimulatedEmbedding(text: string, dimensions = 128): number[] {
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }
  const vec: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    seed = (seed * 1664525 + 1013904223) | 0;
    vec.push(((seed >>> 0) / 4294967296) * 2 - 1);
  }
  return normalizeVector(vec);
}

export function findTopKSimilar(
  query: number[],
  candidates: EmbeddingVector[],
  k: number,
): { item: EmbeddingVector; score: number }[] {
  const scored = candidates.map((item) => ({
    item,
    score: cosineSimilarity(query, item.values),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
