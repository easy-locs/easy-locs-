import { useState, useCallback, useRef, useEffect } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Story } from "@/lib/stories/story-types";
import { emitStoryView, emitStorySwipe, emitStoryClosed } from "@/lib/stories/story-events";
import { useI18n } from "@/lib/i18n";
import StoryProgressBar from "./StoryProgressBar";
import StoryCTABar from "./StoryCTABar";

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

const STORY_DURATION = 6000;

const STORY_TYPE_COLORS: Record<string, string> = {
  property: "hsl(160 60% 45%)",
  stay: "hsl(210 70% 50%)",
  merchant: "hsl(var(--accent))",
  product: "hsl(270 60% 55%)",
  deal: "hsl(0 70% 55%)",
  utility: "hsl(215 15% 50%)",
  mobility: "hsl(185 60% 45%)",
  service: "hsl(var(--accent))",
};

export default function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const { t } = useI18n();
  const [current, setCurrent] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const viewStartTime = useRef(Date.now());
  const sessionStartTime = useRef(Date.now());

  const story = stories[current];
  if (!story) return null;

  useEffect(() => {
    viewStartTime.current = Date.now();
  }, [current]);

  const emitViewTracking = useCallback((storyToTrack: Story, idx: number, completed: boolean) => {
    const viewDuration = Date.now() - viewStartTime.current;
    emitStoryView(storyToTrack, viewDuration, completed, idx, stories.length);
  }, [stories.length]);

  const goNext = useCallback(() => {
    emitViewTracking(stories[current], current, true);
    if (current < stories.length - 1) {
      setDirection(1);
      emitStorySwipe(stories[current], "next", current);
      setCurrent(prev => prev + 1);
    } else {
      const sessionDuration = Date.now() - sessionStartTime.current;
      emitStoryClosed(stories[current], current, stories.length, sessionDuration);
      onClose();
    }
  }, [current, stories, emitViewTracking, onClose]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      emitViewTracking(stories[current], current, false);
      setDirection(-1);
      emitStorySwipe(stories[current], "prev", current);
      setCurrent(prev => prev - 1);
    }
  }, [current, stories, emitViewTracking]);

  const handleClose = useCallback(() => {
    emitViewTracking(stories[current], current, false);
    const sessionDuration = Date.now() - sessionStartTime.current;
    emitStoryClosed(stories[current], current, stories.length, sessionDuration);
    onClose();
  }, [current, stories, emitViewTracking, onClose]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    if (x < rect.width * 0.3) {
      goPrev();
    } else if (x > rect.width * 0.7) {
      goNext();
    }
  }, [goNext, goPrev]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setPaused(false);
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 80) {
      if (dy < 0) goNext();
      else goPrev();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      handleTap(e);
    }
  }, [goNext, goPrev, handleTap]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      else if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, handleClose]);

  const typeColor = STORY_TYPE_COLORS[story.storyType] || "hsl(215 15% 50%)";

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "hsl(228 28% 7%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-[430px] mx-auto overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={story.id}
            custom={direction}
            initial={{ opacity: 0, y: direction >= 0 ? 40 : -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction >= 0 ? -40 : 40 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={story.mediaUrl}
              alt={story.title}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute top-0 left-0 right-0 z-40">
          <StoryProgressBar
            total={stories.length}
            current={current}
            duration={STORY_DURATION}
            paused={paused}
            onComplete={goNext}
          />

          <div className="flex items-center justify-between px-4 mt-3">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm"
                style={{ background: typeColor }}
              >
                {t(`story.type.${story.storyType}`) || story.storyType}
              </span>
              <span className="text-xs text-white/70 font-medium">{story.vertical}</span>
            </div>
            <div className="flex items-center gap-2">
              {story.mediaType === "video" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                  className="p-2 rounded-full text-white backdrop-blur-sm"
                  style={{ background: "hsl(0 0% 0% / 0.3)" }}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="p-2 rounded-full text-white backdrop-blur-sm"
                style={{ background: "hsl(0 0% 0% / 0.3)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <StoryCTABar story={story} />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15 text-[11px] font-medium select-none pointer-events-none tabular-nums">
          {current + 1}/{stories.length}
        </div>
      </div>
    </motion.div>
  );
}
