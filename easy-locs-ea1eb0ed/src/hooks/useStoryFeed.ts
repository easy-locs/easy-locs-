import { useQuery } from "@tanstack/react-query";
import { getStoriesForFeed, FALLBACK_STORY_FEEDS } from "@/data/fallback-stories";
import type { Story, StoryFeed, StoryFeedKey } from "@/lib/stories/story-types";

export function useStoryFeed(feedKey: StoryFeedKey | string) {
  return useQuery<Story[]>({
    queryKey: ["story-feed", feedKey],
    queryFn: () => {
      return getStoriesForFeed(feedKey);
    },
    enabled: !!feedKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoryFeeds() {
  return useQuery<StoryFeed[]>({
    queryKey: ["story-feeds"],
    queryFn: () => FALLBACK_STORY_FEEDS,
    staleTime: 10 * 60 * 1000,
  });
}
