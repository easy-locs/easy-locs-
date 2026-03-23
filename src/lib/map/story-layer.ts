/**
 * Story Layer — Progressive architecture for entity stories.
 * Safe: renders nothing when adapter returns empty or feature is disabled.
 * Future: plug real DB backend without touching consumers.
 */

// ─── Story Data Model ────────────────────────────────────────────────────────

export interface StoryItem {
  id: string;
  entityId: string;
  entityType: "shop" | "brand" | "driver" | "user";
  title: string;
  mediaType: "image" | "video" | "text";
  mediaUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  expiresAt: string;
  city?: string;
  country?: string;
  category?: string;
  subcategory?: string;
  active: boolean;
}

export interface StoryGroup {
  entityId: string;
  entityName: string;
  entityImageUrl?: string;
  stories: StoryItem[];
  hasUnread: boolean;
}

// ─── Story Adapter Interface ─────────────────────────────────────────────────

export interface StoryAdapter {
  /** Fetch story groups near a location */
  fetchNearbyStories(lat: number, lng: number, radiusKm?: number): Promise<StoryGroup[]>;
  /** Fetch stories for a specific entity */
  fetchEntityStories(entityId: string): Promise<StoryItem[]>;
  /** Check if an entity has active stories */
  hasActiveStories(entityId: string): Promise<boolean>;
}

// ─── Empty Adapter (Safe Default) ────────────────────────────────────────────

export const emptyStoryAdapter: StoryAdapter = {
  fetchNearbyStories: async () => [],
  fetchEntityStories: async () => [],
  hasActiveStories: async () => false,
};

// ─── Singleton ───────────────────────────────────────────────────────────────

let currentAdapter: StoryAdapter = emptyStoryAdapter;

export function setStoryAdapter(adapter: StoryAdapter): void {
  currentAdapter = adapter;
}

export function getStoryAdapter(): StoryAdapter {
  return currentAdapter;
}

/**
 * Check if a story item is still active (not expired).
 */
export function isStoryActive(story: StoryItem): boolean {
  if (!story.active) return false;
  return new Date(story.expiresAt) > new Date();
}
