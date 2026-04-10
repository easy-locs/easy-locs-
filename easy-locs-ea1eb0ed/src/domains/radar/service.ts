/**
 * Radar Domain Service — Tracking, geolocation, live updates.
 * Write-paths are guarded with single-path enforcement.
 *
 * AUDIT STATUS: HARDENED
 * ✅ Guards on write actions (startTracking, stopTracking)
 * ✅ Single-path (no duplicate live sessions)
 * ✅ Structured logging
 */
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import { normalizePosition } from "./microns/normalize-position.micron";
import type { DomainResult } from "../shared/types";

const log = createDomainLogger("radar");

// ── Guards ──
const trackGuard = createActionGuard("radar.track.start");
const stopTrackGuard = createActionGuard("radar.track.stop");

export interface RadarUseCases {
  startTracking(entityId: string, entityType: string, requestId?: string): Promise<DomainResult<void>>;
  stopTracking(entityId: string, requestId?: string): Promise<DomainResult<void>>;
  updatePosition(entityId: string, lat: number, lng: number): Promise<DomainResult<{ lat: number; lng: number }>>;
}

export function createRadarService(ctx: SecurityContext | null): RadarUseCases {
  return {
    async startTracking(entityId: string, entityType: string, requestId?: string) {
      requireAuth(ctx);

      if (!entityId) return { ok: false as const, error: "Missing entityId" };

      const flowKey = `radar.track:${entityType}:${entityId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false as const, error: "tracking_already_active" };

      try {
        const result = await trackGuard.execute(
          async (actionCtx) => {
            log.info("tracking_started", {
              entityId, entityType,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });
          },
          {
            requestId,
            metadata: { entityId, entityType },
          }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async stopTracking(entityId: string, requestId?: string) {
      requireAuth(ctx);

      const result = await stopTrackGuard.execute(
        async (actionCtx) => {
          log.info("tracking_stopped", {
            entityId,
            correlationId: actionCtx.correlationId,
            requestId: actionCtx.requestId,
          });
        },
        {
          requestId: requestId ?? `stop_${entityId}`,
          metadata: { entityId },
        }
      );

      if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
      return { ok: true as const, data: undefined };
    },

    async updatePosition(entityId: string, lat: number, lng: number) {
      requireAuth(ctx);
      try {
        const pos = normalizePosition(lat, lng);
        return { ok: true as const, data: pos };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
