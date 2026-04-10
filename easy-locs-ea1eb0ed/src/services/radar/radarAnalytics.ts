export type RadarEventType =
  | "search_started"
  | "search_completed"
  | "filter_used"
  | "filter_reset"
  | "result_clicked"
  | "result_impression"
  | "map_moved"
  | "area_research"
  | "cta_used"
  | "save_favorite"
  | "share_entity"
  | "view_mode_changed"
  | "sort_changed"
  | "no_results"
  | "conversion_after_radar";

export interface RadarEvent {
  type: RadarEventType;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
}

let sessionId = `radar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const eventBuffer: RadarEvent[] = [];
const MAX_BUFFER = 50;

export function resetRadarSession(): void {
  sessionId = `radar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  eventBuffer.length = 0;
}

export function trackRadarEvent(type: RadarEventType, data: Record<string, unknown> = {}): void {
  const event: RadarEvent = {
    type,
    timestamp: Date.now(),
    sessionId,
    data,
  };

  eventBuffer.push(event);

  if (eventBuffer.length > MAX_BUFFER) {
    eventBuffer.splice(0, eventBuffer.length - MAX_BUFFER);
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug(`[RadarAnalytics] ${type}`, data);
  }
}

export function getRadarEventBuffer(): RadarEvent[] {
  return [...eventBuffer];
}

export function getRadarSessionId(): string {
  return sessionId;
}
