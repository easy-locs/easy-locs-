/**
 * RadarInteractionEngine — Decoupled selection, hover, and tap handling.
 * No rendering logic. Injectable.
 */
import type { CanonicalRadarProjection } from "@/lib/domains/canonical-entities";

export type InteractionEvent = "select" | "hover" | "deselect" | "tap" | "long_press";

export interface RadarInteraction {
  event: InteractionEvent;
  entity: CanonicalRadarProjection;
  timestamp: number;
  screenX?: number;
  screenY?: number;
}

export type InteractionHandler = (interaction: RadarInteraction) => void;

export class RadarInteractionEngine {
  private selected: CanonicalRadarProjection | null = null;
  private hovered: CanonicalRadarProjection | null = null;
  private listeners: InteractionHandler[] = [];

  select(entity: CanonicalRadarProjection) {
    this.selected = entity;
    this.emit({ event: "select", entity, timestamp: Date.now() });
  }

  deselect() {
    if (this.selected) {
      const prev = this.selected;
      this.selected = null;
      this.emit({ event: "deselect", entity: prev, timestamp: Date.now() });
    }
  }

  hover(entity: CanonicalRadarProjection) {
    this.hovered = entity;
    this.emit({ event: "hover", entity, timestamp: Date.now() });
  }

  tap(entity: CanonicalRadarProjection, screenX?: number, screenY?: number) {
    this.emit({ event: "tap", entity, timestamp: Date.now(), screenX, screenY });
  }

  getSelected(): CanonicalRadarProjection | null { return this.selected; }
  getHovered(): CanonicalRadarProjection | null { return this.hovered; }

  onInteraction(fn: InteractionHandler): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private emit(interaction: RadarInteraction) {
    this.listeners.forEach(fn => fn(interaction));
  }

  destroy() {
    this.selected = null;
    this.hovered = null;
    this.listeners = [];
  }
}
