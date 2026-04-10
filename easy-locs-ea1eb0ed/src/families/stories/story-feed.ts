/**
 * story.feed — Canonical story feed model.
 */

export interface StoryFeedItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  stories: {
    id: string;
    type: "text" | "media";
    body?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    createdAt: string;
    expiresAt: string;
    seen: boolean;
  }[];
  hasUnseen: boolean;
  lastUpdatedAt: string;
}

export const StoryFeed = {
  /** Sort feed items: unseen first, then by recency */
  sort(items: StoryFeedItem[]): StoryFeedItem[] {
    return [...items].sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
    });
  },

  /** Filter out expired stories */
  filterActive(items: StoryFeedItem[]): StoryFeedItem[] {
    const now = Date.now();
    return items
      .map((item) => ({
        ...item,
        stories: item.stories.filter((s) => new Date(s.expiresAt).getTime() > now),
      }))
      .filter((item) => item.stories.length > 0);
  },

  /** Get unseen count for a feed item */
  getUnseenCount(item: StoryFeedItem): number {
    return item.stories.filter((s) => !s.seen).length;
  },
};
