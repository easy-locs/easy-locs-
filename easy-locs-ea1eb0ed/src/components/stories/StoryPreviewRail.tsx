import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import type { Story } from "@/lib/stories/story-types";
import { emitStoryImpression, emitStoryOpened } from "@/lib/stories/story-events";
import StoryPreviewCard from "./StoryPreviewCard";
import StoryViewer from "./StoryViewer";

interface StoryPreviewRailProps {
  title: string;
  stories: Story[];
  size?: "small" | "medium" | "large";
  feedKey?: string;
  surface?: string;
  onSeeAll?: () => void;
}

export default function StoryPreviewRail({ title, stories, size = "medium", feedKey = "unknown", surface = "rail", onSeeAll }: StoryPreviewRailProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const impressionsFired = useRef<Set<string>>(new Set());

  useEffect(() => {
    stories.forEach((story, i) => {
      if (!impressionsFired.current.has(story.id)) {
        impressionsFired.current.add(story.id);
        emitStoryImpression(story, feedKey, i, surface);
      }
    });
  }, [stories, feedKey, surface]);

  const openViewer = useCallback((index: number) => {
    const story = stories[index];
    if (story) {
      emitStoryOpened(story, feedKey, index);
    }
    setViewerIndex(index);
    setViewerOpen(true);
  }, [stories, feedKey]);

  if (!stories.length) return null;

  return (
    <>
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2 px-4 sm:px-5">
          <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="flex items-center gap-0.5 text-[11px] font-medium text-primary active:opacity-70"
            >
              See all <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
        <div
          className="flex gap-2.5 px-3 sm:px-4 overflow-x-auto scrollbar-hide pb-1"
          data-no-swipe
        >
          {stories.map((story, i) => (
            <StoryPreviewCard
              key={story.id}
              story={story}
              size={size}
              onClick={() => openViewer(i)}
            />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            stories={stories}
            initialIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
