import { platformBus } from "@/lib/shared/platform-bus";
import type { Story, StoryCTAType, StoryEntityType } from "./story-types";

export interface StoryEventPayload {
  storyId: string;
  entityId: string;
  entityType: StoryEntityType;
  vertical: string;
  categoryKey: string;
  subcategoryKey: string;
}

export interface StoryCTAPayload extends StoryEventPayload {
  ctaType: StoryCTAType;
  ctaLabel?: string;
}

export interface StoryImpressionPayload extends StoryEventPayload {
  feedKey: string;
  position: number;
  surface: string;
}

export interface StoryViewPayload extends StoryEventPayload {
  viewDurationMs: number;
  completed: boolean;
  indexInFeed: number;
  totalInFeed: number;
}

export interface StorySwipePayload extends StoryEventPayload {
  direction: "next" | "prev";
  indexInFeed: number;
}

function toEventPayload(story: Story): StoryEventPayload {
  return {
    storyId: story.id,
    entityId: story.entityId,
    entityType: story.entityType,
    vertical: story.vertical,
    categoryKey: story.categoryKey,
    subcategoryKey: story.subcategoryKey,
  };
}

export function emitStoryCTA(story: Story, ctaType: StoryCTAType, ctaLabel?: string) {
  const payload: StoryCTAPayload = {
    ...toEventPayload(story),
    ctaType,
    ctaLabel,
  };
  platformBus.emit("story:cta_clicked", payload, "story");
}

export function emitStoryImpression(story: Story, feedKey: string, position: number, surface: string) {
  const payload: StoryImpressionPayload = {
    ...toEventPayload(story),
    feedKey,
    position,
    surface,
  };
  platformBus.emit("story:impression", payload, "story");
}

export function emitStoryView(story: Story, viewDurationMs: number, completed: boolean, indexInFeed: number, totalInFeed: number) {
  const payload: StoryViewPayload = {
    ...toEventPayload(story),
    viewDurationMs,
    completed,
    indexInFeed,
    totalInFeed,
  };
  platformBus.emit("story:viewed", payload, "story");
}

export function emitStorySwipe(story: Story, direction: "next" | "prev", indexInFeed: number) {
  const payload: StorySwipePayload = {
    ...toEventPayload(story),
    direction,
    indexInFeed,
  };
  platformBus.emit("story:swiped", payload, "story");
}

export function emitStoryOpened(story: Story, feedKey: string, position: number) {
  platformBus.emit("story:opened", {
    ...toEventPayload(story),
    feedKey,
    position,
  }, "story");
}

export function emitStoryClosed(story: Story, indexInFeed: number, totalInFeed: number, viewDurationMs: number) {
  platformBus.emit("story:closed", {
    ...toEventPayload(story),
    indexInFeed,
    totalInFeed,
    viewDurationMs,
  }, "story");
}
