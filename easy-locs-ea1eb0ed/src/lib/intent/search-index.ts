import type { CanonicalEntityType, EntityVertical } from "./intent-types";

export interface SearchableEntity {
  entityId: string;
  entityType: CanonicalEntityType;
  vertical: EntityVertical | string;
  categoryKey: string;
  subcategoryKey: string;
  title: string;
  keywords: string[];
  locationLabel?: string;
  priceLabel?: string;
  rating?: number;
  rankScore: number;
}

export interface SearchQuery {
  text?: string;
  vertical?: string;
  entityType?: string;
  limit?: number;
}

export interface SearchResult {
  entity: SearchableEntity;
  relevance: number;
}

class IntentSearchIndex {
  private entities: SearchableEntity[] = [];

  register(entities: SearchableEntity[]) {
    this.entities.push(...entities);
  }

  clear() {
    this.entities = [];
  }

  get size() {
    return this.entities.length;
  }

  search(query: SearchQuery): SearchResult[] {
    let candidates = this.entities;

    if (query.vertical) {
      candidates = candidates.filter((e) => e.vertical === query.vertical);
    }

    if (query.entityType) {
      candidates = candidates.filter((e) => e.entityType === query.entityType);
    }

    let results: SearchResult[];

    if (query.text && query.text.trim().length > 0) {
      const terms = query.text.toLowerCase().trim().split(/\s+/);
      results = candidates
        .map((entity) => ({
          entity,
          relevance: computeTextRelevance(entity, terms),
        }))
        .filter((r) => r.relevance > 0);
    } else {
      results = candidates.map((entity) => ({
        entity,
        relevance: entity.rankScore,
      }));
    }

    results.sort((a, b) => b.relevance - a.relevance);

    const limit = query.limit ?? 20;
    return results.slice(0, limit);
  }
}

function computeTextRelevance(entity: SearchableEntity, terms: string[]): number {
  let score = 0;
  const titleLower = entity.title.toLowerCase();
  const keywordsJoined = entity.keywords.join(" ").toLowerCase();
  const locationLower = (entity.locationLabel ?? "").toLowerCase();

  for (const term of terms) {
    if (titleLower.includes(term)) score += 10;
    if (titleLower.startsWith(term)) score += 5;
    if (keywordsJoined.includes(term)) score += 3;
    if (locationLower.includes(term)) score += 2;
    if (entity.vertical === term) score += 4;
    if (entity.categoryKey === term) score += 3;
  }

  score += entity.rankScore * 0.1;

  return score;
}

export const intentSearchIndex = new IntentSearchIndex();
