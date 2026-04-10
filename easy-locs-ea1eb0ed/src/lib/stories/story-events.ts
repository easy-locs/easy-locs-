import { eventBus } from "@/lib/core/event-bus";
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
  eventBus.emit("story.cta.clicked", payload);
}

export function emitStoryImpression(story: Story, feedKey: string, position: number, surface: string) {
  const payload: StoryImpressionPayload = {
    ...toEventPayload(story),
    feedKey,
    position,
    surface,
  };
  eventBus.emit("story.impression", payload);
}

export function emitStoryView(story: Story, viewDurationMs: number, completed: boolean, indexInFeed: number, totalInFeed: number) {
  const payload: StoryViewPayload = {
    ...toEventPayload(story),
    viewDurationMs,
    completed,
    indexInFeed,
    totalInFeed,
  };
  eventBus.emit("story.viewed", payload);
}

export function emitStorySwipe(story: Story, direction: "next" | "prev", indexInFeed: number) {
  const payload: StorySwipePayload = {
    ...toEventPayload(story),
    direction,
    indexInFeed,
  };
  eventBus.emit("story.swiped", payload);
}

export function emitStoryOpened(story: Story, feedKey: string, position: number) {
  eventBus.emit("story.opened", {
    ...toEventPayload(story),
    feedKey,
    position,
  });
}

export function emitStoryClosed(story: Story, indexInFeed: number, totalInFeed: number, viewDurationMs: number) {
  eventBus.emit("story.closed", {
    ...toEventPayload(story),
    indexInFeed,
    totalInFeed,
    viewDurationMs,
  });
}
