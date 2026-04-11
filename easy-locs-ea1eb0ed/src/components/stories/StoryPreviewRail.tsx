import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import type { Story } from "@/lib/stories/story-types";
import { emitStoryImpression, emitStoryOpened } from "@/lib/stories/story-events";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-4">
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>{title}</h3>
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="flex items-center gap-0.5 text-xs font-semibold active:opacity-70 transition-opacity"
              style={{ color: "hsl(38 65% 56%)" }}
            >
              {t("story.see_all") || "See all"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
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
