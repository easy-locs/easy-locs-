const MEILISEARCH_URL = () => Deno.env.get("MEILISEARCH_URL") ?? "";
const MEILISEARCH_API_KEY = () => Deno.env.get("MEILISEARCH_API_KEY") ?? "";

interface MeilisearchDocument {
  id: string;
  [key: string]: unknown;
}

interface MeilisearchSearchOptions {
  q: string;
  limit?: number;
  offset?: number;
  filter?: string[];
  facets?: string[];
  sort?: string[];
  attributesToHighlight?: string[];
  attributesToRetrieve?: string[];
}

interface MeilisearchSearchResult {
  hits: MeilisearchDocument[];
  estimatedTotalHits: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
  facetDistribution?: Record<string, Record<string, number>>;
}

async function meiliRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const baseUrl = MEILISEARCH_URL();
  if (!baseUrl) {
    throw new Error("MEILISEARCH_URL is not configured. Set the MEILISEARCH_URL environment variable.");
  }
  const url = `${baseUrl}${path}`;
  const apiKey = MEILISEARCH_API_KEY();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function meiliSearch(
  index: string,
  options: MeilisearchSearchOptions
): Promise<MeilisearchSearchResult> {
  const resp = await meiliRequest("POST", `/indexes/${index}/search`, options);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Meilisearch search error [${resp.status}]: ${err}`);
  }
  return resp.json();
}

export async function meiliAddDocuments(
  index: string,
  documents: MeilisearchDocument[],
  primaryKey = "id"
): Promise<{ taskUid: number }> {
  const resp = await meiliRequest(
    "POST",
    `/indexes/${index}/documents?primaryKey=${primaryKey}`,
    documents
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Meilisearch add docs error [${resp.status}]: ${err}`);
  }
  return resp.json();
}

export async function meiliDeleteDocuments(
  index: string,
  ids: string[]
): Promise<{ taskUid: number }> {
  const resp = await meiliRequest("POST", `/indexes/${index}/documents/delete-batch`, ids);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Meilisearch delete error [${resp.status}]: ${err}`);
  }
  return resp.json();
}

export async function meiliUpdateSettings(
  index: string,
  settings: Record<string, unknown>
): Promise<{ taskUid: number }> {
  const resp = await meiliRequest("PATCH", `/indexes/${index}/settings`, settings);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Meilisearch settings error [${resp.status}]: ${err}`);
  }
  return resp.json();
}

export async function meiliCreateIndex(
  uid: string,
  primaryKey = "id"
): Promise<{ taskUid: number }> {
  const resp = await meiliRequest("POST", "/indexes", { uid, primaryKey });
  const body = await resp.text();
  if (!resp.ok) {
    if (!body.includes("already_exists")) {
      throw new Error(`Meilisearch create index error [${resp.status}]: ${body}`);
    }
    return { taskUid: -1 };
  }
  return JSON.parse(body);
}

export async function meiliGetTask(taskUid: number): Promise<Record<string, unknown>> {
  const resp = await meiliRequest("GET", `/tasks/${taskUid}`);
  return resp.json();
}

export function isMeilisearchAvailable(): boolean {
  return !!Deno.env.get("MEILISEARCH_URL");
}

export async function checkMeilisearchHealth(): Promise<{ status: string; version?: string } | null> {
  if (!isMeilisearchAvailable()) return null;
  try {
    const resp = await meiliRequest("GET", "/health");
    if (resp.ok) return resp.json();
    return null;
  } catch {
    return null;
  }
}
