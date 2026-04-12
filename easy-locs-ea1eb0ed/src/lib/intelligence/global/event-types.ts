import type {
  GlobalFeedCategory,
  GlobalFeedPriority,
  GlobalFeedSourceTier,
} from "@/domains/shared/canonical-types";

export const INTELLIGENCE_EVENT_NAMESPACE = "global_intelligence" as const;
export const COMMERCE_EVENT_NAMESPACE = "local_social_commerce" as const;

export type IntelligenceEventType =
  | "feed_item.ingested"
  | "feed_item.ranked"
  | "feed_item.expired"
  | "feed_item.deduplicated"
  | "source.registered"
  | "source.health_check"
  | "ticker.contribution_ready";

export type CommerceEventType =
  | "listing.created"
  | "listing.published"
  | "listing.reserved"
  | "listing.completed"
  | "listing.expired"
  | "listing.removed"
  | "listing.flagged"
  | "listing.quarantined"
  | "intent.created"
  | "intent.updated"
  | "intent.expired"
  | "match.candidate_found"
  | "match.presented"
  | "match.acknowledged"
  | "match.completed"
  | "match.expired"
  | "moderation.auto_approved"
  | "moderation.flagged"
  | "moderation.quarantined"
  | "moderation.removed";

export interface IntelligenceEventPayload {
  "feed_item.ingested": {
    itemId: string;
    category: GlobalFeedCategory;
    priority: GlobalFeedPriority;
    sourceTier: GlobalFeedSourceTier;
    country: string;
  };
  "feed_item.ranked": {
    itemId: string;
    relevanceScore: number;
    freshnessScore: number;
    personalRelevance: number;
  };
  "feed_item.expired": {
    itemId: string;
    reason: "ttl" | "superseded" | "retracted";
  };
  "feed_item.deduplicated": {
    keptItemId: string;
    removedItemId: string;
    contentHash: string;
  };
  "source.registered": {
    sourceId: string;
    sourceName: string;
    tier: GlobalFeedSourceTier;
    categories: GlobalFeedCategory[];
  };
  "source.health_check": {
    sourceId: string;
    healthy: boolean;
    latencyMs: number;
  };
  "ticker.contribution_ready": {
    itemId: string;
    tickerText: string;
    priority: GlobalFeedPriority;
    ttlSeconds: number;
  };
}

export interface CommerceEventPayload {
  "listing.created": { listingId: string; sellerId: string; category: string };
  "listing.published": { listingId: string; country: string; city: string };
  "listing.reserved": { listingId: string; buyerId: string };
  "listing.completed": { listingId: string; buyerId: string; sellerId: string };
  "listing.expired": { listingId: string; reason: "ttl" | "manual" };
  "listing.removed": { listingId: string; reason: string };
  "listing.flagged": { listingId: string; reason: string };
  "listing.quarantined": { listingId: string; reason: string };
  "intent.created": { intentId: string; userId: string; category: string };
  "intent.updated": { intentId: string; fields: string[] };
  "intent.expired": { intentId: string };
  "match.candidate_found": { matchId: string; listingId: string; intentId: string | null; score: number };
  "match.presented": { matchId: string; buyerId: string };
  "match.acknowledged": { matchId: string; buyerId: string };
  "match.completed": { matchId: string; buyerId: string; sellerId: string };
  "match.expired": { matchId: string };
  "moderation.auto_approved": { entityType: string; entityId: string };
  "moderation.flagged": { entityType: string; entityId: string; reason: string };
  "moderation.quarantined": { entityType: string; entityId: string; reason: string };
  "moderation.removed": { entityType: string; entityId: string; reason: string };
}
