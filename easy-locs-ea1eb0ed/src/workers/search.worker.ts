import { exposeWorkerMethods } from "./worker-rpc";

export interface SearchItem {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  score?: number;
}

export interface SearchRequest {
  items: SearchItem[];
  query: string;
  limit?: number;
  filters?: { category?: string; tags?: string[] };
}

export interface SearchResult {
  id: string;
  title: string;
  score: number;
  matchedFields: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter(Boolean);
}

function computeScore(item: SearchItem, queryTokens: string[]): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  const titleNorm = normalizeText(item.title);
  const descNorm = item.description ? normalizeText(item.description) : "";
  const tagsNorm = item.tags?.map(normalizeText) ?? [];

  for (const token of queryTokens) {
    if (titleNorm.includes(token)) {
      score += titleNorm === token ? 100 : titleNorm.startsWith(token) ? 80 : 60;
      if (!matchedFields.includes("title")) matchedFields.push("title");
    }
    if (descNorm.includes(token)) {
      score += 30;
      if (!matchedFields.includes("description")) matchedFields.push("description");
    }
    for (const tag of tagsNorm) {
      if (tag.includes(token)) {
        score += 40;
        if (!matchedFields.includes("tags")) matchedFields.push("tags");
        break;
      }
    }
  }

  if (item.score != null) {
    score += item.score * 0.1;
  }

  return { score, matchedFields };
}

function searchIndex(request: SearchRequest): SearchResult[] {
  const { items, query, limit = 50, filters } = request;
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  let candidates = items;
  if (filters?.category) {
    candidates = candidates.filter((i) => i.category === filters.category);
  }
  if (filters?.tags?.length) {
    const filterTags = new Set(filters.tags.map(normalizeText));
    candidates = candidates.filter(
      (i) => i.tags?.some((t) => filterTags.has(normalizeText(t))),
    );
  }

  const results: SearchResult[] = [];
  for (const item of candidates) {
    const { score, matchedFields } = computeScore(item, queryTokens);
    if (score > 0) {
      results.push({ id: item.id, title: item.title, score, matchedFields });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

const workerMethods = {
  search: searchIndex,
};

export type SearchWorkerMethods = typeof workerMethods;

exposeWorkerMethods(workerMethods);
