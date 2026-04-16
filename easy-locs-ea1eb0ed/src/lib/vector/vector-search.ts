import { callEdgeFunction } from "@/lib/edge-client";

export interface VectorSearchOptions {
  query: string;
  entityType?: "listing" | "product" | "service" | "user_profile";
  limit?: number;
  threshold?: number;
}

export interface VectorSearchResult {
  entityId: string;
  entityType: string;
  similarity: number;
  textContent: string;
}

export async function vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
  try {
    const data = await callEdgeFunction<{
      results: Array<{
        entity_id: string;
        entity_type: string;
        similarity: number;
        text_content: string;
      }>;
    }>("vector-embed", {
      action: "search_similar",
      text: options.query,
      entityType: options.entityType,
      limit: options.limit ?? 10,
      threshold: options.threshold ?? 0.7,
    });

    return (data.results ?? []).map((r) => ({
      entityId: r.entity_id,
      entityType: r.entity_type,
      similarity: r.similarity,
      textContent: r.text_content,
    }));
  } catch (err) {
    console.error("[vector-search] Search failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function embedEntity(
  entityId: string,
  entityType: string,
  text: string
): Promise<boolean> {
  try {
    await callEdgeFunction("vector-embed", {
      action: "embed_single",
      entityId,
      entityType,
      text,
    });
    return true;
  } catch (err) {
    console.error("[vector-search] Embed failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export function buildEmbeddingText(entity: {
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  city?: string;
  country?: string;
  tags?: string[];
}): string {
  const parts: string[] = [];
  if (entity.title || entity.name) parts.push(entity.title ?? entity.name!);
  if (entity.description) parts.push(entity.description);
  if (entity.category) parts.push(`Category: ${entity.category}`);
  if (entity.subcategory) parts.push(`Subcategory: ${entity.subcategory}`);
  if (entity.city) parts.push(`Location: ${entity.city}`);
  if (entity.country) parts.push(entity.country);
  if (entity.tags?.length) parts.push(`Tags: ${entity.tags.join(", ")}`);
  return parts.join(". ");
}
