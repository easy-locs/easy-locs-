import * as Comlink from "comlink";

export interface SearchResult {
  id: string;
  score: number;
  highlights: string[];
}

export interface SearchDocument {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
}

export interface SearchWorkerAPI {
  buildIndex(documents: SearchDocument[]): Promise<number>;
  search(query: string, limit?: number): Promise<SearchResult[]>;
  addDocument(doc: SearchDocument): Promise<void>;
  removeDocument(id: string): Promise<void>;
  clearIndex(): Promise<void>;
  getIndexSize(): Promise<number>;
}

interface IndexEntry {
  id: string;
  tokens: string[];
  tokenSet: Set<string>;
  original: SearchDocument;
}

let index: IndexEntry[] = [];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s\-_.,;:!?'"()\[\]{}\/\\]+/)
    .filter((t) => t.length > 1);
}

function buildEntry(doc: SearchDocument): IndexEntry {
  const parts = [doc.title, doc.description ?? "", ...(doc.tags ?? []), doc.category ?? ""];
  const tokens = parts.flatMap(tokenize);
  return { id: doc.id, tokens, tokenSet: new Set(tokens), original: doc };
}

function scoreMatch(entry: IndexEntry, queryTokens: string[]): number {
  let score = 0;
  for (const qt of queryTokens) {
    if (entry.tokenSet.has(qt)) {
      score += 10;
    } else {
      for (const et of entry.tokens) {
        if (et.startsWith(qt)) {
          score += 5;
          break;
        } else if (et.includes(qt)) {
          score += 2;
          break;
        }
      }
    }
  }
  return score;
}

function extractHighlights(doc: SearchDocument, queryTokens: string[]): string[] {
  const highlights: string[] = [];
  const text = [doc.title, doc.description ?? ""].join(" ");
  for (const qt of queryTokens) {
    const idx = text.toLowerCase().indexOf(qt);
    if (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + qt.length + 20);
      highlights.push(text.slice(start, end));
    }
  }
  return highlights.slice(0, 3);
}

const api: SearchWorkerAPI = {
  async buildIndex(documents) {
    index = documents.map(buildEntry);
    return index.length;
  },

  async search(query, limit = 20) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scored = index
      .map((entry) => ({
        id: entry.id,
        score: scoreMatch(entry, queryTokens),
        highlights: extractHighlights(entry.original, queryTokens),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  },

  async addDocument(doc) {
    index = index.filter((e) => e.id !== doc.id);
    index.push(buildEntry(doc));
  },

  async removeDocument(id) {
    index = index.filter((e) => e.id !== id);
  },

  async clearIndex() {
    index = [];
  },

  async getIndexSize() {
    return index.length;
  },
};

Comlink.expose(api);
