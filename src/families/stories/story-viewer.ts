/**
 * story.viewer — Canonical story viewer state machine.
 */
import { create } from "zustand";

export interface StoryViewerState {
  isOpen: boolean;
  currentIndex: number;
  isPaused: boolean;
  totalStories: number;
  storyOwnerId: string | null;
  seenIds: Set<string>;
}

interface StoryViewerStore extends StoryViewerState {
  open: (ownerId: string, total: number, startIndex?: number) => void;
  close: () => void;
  next: () => boolean;
  prev: () => boolean;
  goTo: (index: number) => void;
  pause: () => void;
  resume: () => void;
  markSeen: (storyId: string) => void;
}

export const useStoryViewerStore = create<StoryViewerStore>((set, get) => ({
  isOpen: false,
  currentIndex: 0,
  isPaused: false,
  totalStories: 0,
  storyOwnerId: null,
  seenIds: new Set(),

  open: (ownerId, total, startIndex = 0) =>
    set({ isOpen: true, storyOwnerId: ownerId, totalStories: total, currentIndex: startIndex, isPaused: false }),

  close: () =>
    set({ isOpen: false, storyOwnerId: null, currentIndex: 0, totalStories: 0, isPaused: false }),

  next: () => {
    const { currentIndex, totalStories } = get();
    if (currentIndex < totalStories - 1) {
      set({ currentIndex: currentIndex + 1 });
      return true;
    }
    return false; // reached end
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
      return true;
    }
    return false;
  },

  goTo: (index) => set({ currentIndex: index }),
  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),

  markSeen: (storyId) =>
    set((state) => {
      const next = new Set(state.seenIds);
      next.add(storyId);
      return { seenIds: next };
    }),
}));

export const StoryViewer = {
  useStore: useStoryViewerStore,
};
