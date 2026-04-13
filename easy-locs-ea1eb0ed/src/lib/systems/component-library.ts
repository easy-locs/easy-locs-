export type FeedbackType = "success" | "error" | "warning" | "info" | "loading";
export type SheetSize = "sm" | "md" | "lg" | "full";
export type TransitionDirection = "up" | "down" | "left" | "right" | "fade";

export interface ToastConfig {
  id: string;
  type: FeedbackType;
  title: string;
  description?: string;
  duration: number;
  dismissible: boolean;
  action?: { label: string; onClick: () => void };
}

export interface BottomSheetConfig {
  id: string;
  size: SheetSize;
  title: string | null;
  dismissible: boolean;
  showHandle: boolean;
  snapPoints: number[];
}

export interface EmptyStateConfig {
  icon: string;
  title: string;
  description: string;
  actionLabel: string | null;
  actionRoute: string | null;
}

export interface SkeletonConfig {
  type: "text" | "card" | "list-item" | "avatar" | "image" | "chart";
  count: number;
  animated: boolean;
}

export interface StepperConfig {
  steps: Array<{ id: string; label: string; description?: string }>;
  currentStep: number;
  orientation: "horizontal" | "vertical";
  allowNavigation: boolean;
}

export interface FilterChipGroup {
  groupId: string;
  label: string;
  chips: Array<{ id: string; label: string; count?: number; selected: boolean }>;
  multiSelect: boolean;
}

export interface PullToRefreshConfig {
  enabled: boolean;
  threshold: number;
  maxDistance: number;
  resistance: number;
}

export interface InfiniteScrollConfig {
  enabled: boolean;
  threshold: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
}

export interface SwipeActionConfig {
  leftAction: { label: string; color: string; icon: string; onSwipe: () => void } | null;
  rightAction: { label: string; color: string; icon: string; onSwipe: () => void } | null;
  threshold: number;
}

export const EMPTY_STATES: Record<string, EmptyStateConfig> = {
  no_orders: { icon: "shopping-bag", title: "No orders yet", description: "Your orders will appear here", actionLabel: "Browse", actionRoute: "/browse" },
  no_listings: { icon: "package", title: "No listings yet", description: "Create your first listing to start selling", actionLabel: "Create Listing", actionRoute: "/sell/create" },
  no_messages: { icon: "message-circle", title: "No messages", description: "Start a conversation", actionLabel: "New Chat", actionRoute: "/orbit" },
  no_notifications: { icon: "bell", title: "All caught up", description: "No new notifications", actionLabel: null, actionRoute: null },
  no_transactions: { icon: "credit-card", title: "No transactions", description: "Your transaction history will appear here", actionLabel: "Top Up", actionRoute: "/wallet/top-up" },
  no_favorites: { icon: "heart", title: "No favorites", description: "Save items you like", actionLabel: "Browse", actionRoute: "/browse" },
  no_reviews: { icon: "star", title: "No reviews yet", description: "Reviews from buyers will appear here", actionLabel: null, actionRoute: null },
  no_properties: { icon: "home", title: "No properties", description: "Add your first property", actionLabel: "Add Property", actionRoute: "/me/gestion-immo/create" },
  no_search_results: { icon: "search", title: "No results found", description: "Try adjusting your search or filters", actionLabel: "Clear Filters", actionRoute: null },
  offline: { icon: "wifi-off", title: "You're offline", description: "Check your connection and try again", actionLabel: "Retry", actionRoute: null },
  error: { icon: "alert-triangle", title: "Something went wrong", description: "An error occurred. Please try again.", actionLabel: "Retry", actionRoute: null },
};

export function getEmptyState(key: string): EmptyStateConfig {
  return EMPTY_STATES[key] ?? EMPTY_STATES.error;
}

export function createToast(type: FeedbackType, title: string, description?: string, duration = 4000): ToastConfig {
  return {
    id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type,
    title,
    description,
    duration,
    dismissible: true,
  };
}

export function createSkeleton(type: SkeletonConfig["type"], count = 1): SkeletonConfig {
  return { type, count, animated: true };
}

export const DEFAULT_PULL_TO_REFRESH: PullToRefreshConfig = {
  enabled: true,
  threshold: 80,
  maxDistance: 150,
  resistance: 2.5,
};

export const DEFAULT_INFINITE_SCROLL: InfiniteScrollConfig = {
  enabled: true,
  threshold: 200,
  pageSize: 20,
  hasMore: true,
  loading: false,
};
