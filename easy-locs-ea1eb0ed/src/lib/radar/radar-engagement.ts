export type EngagementLevel = "preview" | "interactive" | "transition" | "full";

export type TransitionTrigger =
  | "see_more"
  | "open_map"
  | "explore_zone"
  | "full_search"
  | "filter_more"
  | "active_search";

export interface EngagementState {
  level: EngagementLevel;
  vertical?: string;
  sort?: string;
  query?: string;
  filterValues?: Record<string, unknown>;
  scrollPosition?: number;
}

export function shouldTransitionToRadar(trigger: TransitionTrigger): boolean {
  const fullTransitionTriggers: TransitionTrigger[] = [
    "open_map",
    "explore_zone",
    "full_search",
    "filter_more",
    "active_search",
  ];
  return fullTransitionTriggers.includes(trigger);
}

export function buildRadarRoute(state: EngagementState): string {
  const params = new URLSearchParams();
  if (state.vertical) params.set("vertical", state.vertical);
  if (state.sort) params.set("sort", state.sort);
  if (state.query) params.set("q", state.query);
  const qs = params.toString();
  return qs ? `/radar?${qs}` : "/radar";
}
