import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  euclideanDistance,
  averageVectors,
  normalizeVector,
  generateSimulatedEmbedding,
  findTopKSimilar,
  type EmbeddingVector,
} from "./vector-similarity";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 when one vector is all zeros", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("correctly computes similarity for non-trivial vectors", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const dot = 1 * 4 + 2 * 5 + 3 * 6;
    const normA = Math.sqrt(1 + 4 + 9);
    const normB = Math.sqrt(16 + 25 + 36);
    expect(cosineSimilarity(a, b)).toBeCloseTo(dot / (normA * normB), 5);
  });

  it("is symmetric", () => {
    const a = [3, -1, 7];
    const b = [2, 5, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});

describe("euclideanDistance", () => {
  it("returns 0 for identical vectors", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("returns correct distance for simple case", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 5);
  });

  it("returns Infinity for mismatched lengths", () => {
    expect(euclideanDistance([1], [1, 2])).toBe(Infinity);
  });
});

describe("averageVectors", () => {
  it("returns empty array for no vectors", () => {
    expect(averageVectors([])).toEqual([]);
  });

  it("returns the vector itself for single input", () => {
    expect(averageVectors([[2, 4, 6]])).toEqual([2, 4, 6]);
  });

  it("computes element-wise average", () => {
    const result = averageVectors([
      [2, 4],
      [4, 8],
    ]);
    expect(result).toEqual([3, 6]);
  });
});

describe("normalizeVector", () => {
  it("returns unit length vector", () => {
    const result = normalizeVector([3, 4]);
    const norm = Math.sqrt(result[0] ** 2 + result[1] ** 2);
    expect(norm).toBeCloseTo(1, 5);
  });

  it("returns original vector when all zeros", () => {
    expect(normalizeVector([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("preserves direction", () => {
    const result = normalizeVector([6, 0, 0]);
    expect(result).toEqual([1, 0, 0]);
  });
});

describe("generateSimulatedEmbedding", () => {
  it("generates vector of specified dimensions", () => {
    const embedding = generateSimulatedEmbedding("test", 64);
    expect(embedding).toHaveLength(64);
  });

  it("defaults to 128 dimensions", () => {
    const embedding = generateSimulatedEmbedding("test");
    expect(embedding).toHaveLength(128);
  });

  it("produces normalized output (unit length)", () => {
    const embedding = generateSimulatedEmbedding("hello world");
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 4);
  });

  it("is deterministic for same input", () => {
    const a = generateSimulatedEmbedding("deterministic");
    const b = generateSimulatedEmbedding("deterministic");
    expect(a).toEqual(b);
  });

  it("produces different output for different inputs", () => {
    const a = generateSimulatedEmbedding("text A");
    const b = generateSimulatedEmbedding("text B");
    expect(a).not.toEqual(b);
  });
});

describe("findTopKSimilar", () => {
  const candidates: EmbeddingVector[] = [
    { id: "a", values: normalizeVector([1, 0, 0]) },
    { id: "b", values: normalizeVector([0, 1, 0]) },
    { id: "c", values: normalizeVector([1, 1, 0]) },
    { id: "d", values: normalizeVector([0, 0, 1]) },
  ];

  it("returns top k items sorted by descending similarity", () => {
    const query = normalizeVector([1, 0, 0]);
    const results = findTopKSimilar(query, candidates, 2);
    expect(results).toHaveLength(2);
    expect(results[0].item.id).toBe("a");
    expect(results[0].score).toBeCloseTo(1, 5);
    expect(results[1].item.id).toBe("c");
  });

  it("returns fewer items if k exceeds candidates", () => {
    const query = [1, 0, 0];
    const results = findTopKSimilar(query, candidates, 10);
    expect(results).toHaveLength(4);
  });

  it("ranks most similar items first", () => {
    const query = normalizeVector([0, 1, 0]);
    const results = findTopKSimilar(query, candidates, 4);
    expect(results[0].item.id).toBe("b");
  });
});
