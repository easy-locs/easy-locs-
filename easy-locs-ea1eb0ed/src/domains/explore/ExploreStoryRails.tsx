import { memo } from "react";
import StoryPreviewRail from "@/components/stories/StoryPreviewRail";
import type { Story } from "@/lib/stories/story-types";

interface ExploreStoryRailsProps {
  feeds: {
    forYou: Story[];
    food: Story[];
    property: Story[];
    stay: Story[];
    trending: Story[];
  };
}

const STORY_RAILS = [
  { key: "forYou", title: "For You", feedKey: "dashboard_for_you", surface: "explore" },
  { key: "food", title: "Food Stories", feedKey: "food_nearby", surface: "explore" },
  { key: "property", title: "Property Stories", feedKey: "property_buy", surface: "explore" },
  { key: "stay", title: "Stay Stories", feedKey: "stay_trending", surface: "explore" },
  { key: "trending", title: "Trending", feedKey: "dashboard_trending", surface: "explore" },
] as const;

export const ExploreStoryRails = memo(function ExploreStoryRails({ feeds }: ExploreStoryRailsProps) {
  const activeRails = STORY_RAILS.filter((rail) => {
    const stories = feeds[rail.key as keyof typeof feeds];
    return stories && stories.length > 0;
  });

  if (activeRails.length === 0) return null;

  return (
    <div className="py-2">
      {activeRails.map((rail) => {
        const stories = feeds[rail.key as keyof typeof feeds];
        return (
          <StoryPreviewRail
            key={rail.key}
            title={rail.title}
            stories={stories.slice(0, 12)}
            size="medium"
            feedKey={rail.feedKey}
            surface={rail.surface}
          />
        );
      })}
    </div>
  );
});
