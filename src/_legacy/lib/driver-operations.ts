/**
 * Driver Operational System — PASS69 Block B
 * Status management, mission history, earnings tracking, demand heatmap.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DriverStatus = "online" | "offline" | "busy" | "on_delivery" | "break";

export interface DriverSession {
  driverId: string;
  status: DriverStatus;
  startedAt: number;
  lastHeartbeatAt: number;
  lat: number;
  lng: number;
  currentJobId: string | null;
  /** Seconds online in current session */
  onlineDurationSec: number;
}

export interface Mission {
  id: string;
  driverId: string;
  jobId: string;
  status: MissionStatus;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number;
  assignedAt: number;
  acceptedAt: number | null;
  pickedUpAt: number | null;
  deliveredAt: number | null;
  cancelledAt: number | null;
  cancellationReason: string | null;
  earnings: number;
  currency: string;
  tip: number;
  rating: number | null;
  customerFeedback: string | null;
}

export type MissionStatus =
  | "assigned"
  | "accepted"
  | "heading_to_pickup"
  | "at_pickup"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "failed";

// ─── Status Manager ──────────────────────────────────────────────────────────

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class DriverStatusManager {
  private sessions = new Map<string, DriverSession>();

  /** Driver goes online */
  goOnline(driverId: string, lat: number, lng: number): DriverSession {
    const session: DriverSession = {
      driverId,
      status: "online",
      startedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      lat,
      lng,
      currentJobId: null,
      onlineDurationSec: 0,
    };
    this.sessions.set(driverId, session);
    return session;
  }

  /** Driver goes offline */
  goOffline(driverId: string): DriverSession | null {
    const session = this.sessions.get(driverId);
    if (!session) return null;
    session.status = "offline";
    session.onlineDurationSec = Math.round((Date.now() - session.startedAt) / 1000);
    this.sessions.delete(driverId);
    return session;
  }

  /** Update driver position + heartbeat */
  heartbeat(driverId: string, lat: number, lng: number): DriverSession | null {
    const session = this.sessions.get(driverId);
    if (!session) return null;
    session.lat = lat;
    session.lng = lng;
    session.lastHeartbeatAt = Date.now();
    session.onlineDurationSec = Math.round((Date.now() - session.startedAt) / 1000);
    return session;
  }

  /** Update status (busy, on_delivery, break, etc.) */
  setStatus(driverId: string, status: DriverStatus, jobId?: string): DriverSession | null {
    const session = this.sessions.get(driverId);
    if (!session) return null;
    session.status = status;
    if (jobId !== undefined) session.currentJobId = jobId;
    return session;
  }

  /** Get current session */
  getSession(driverId: string): DriverSession | null {
    return this.sessions.get(driverId) ?? null;
  }

  /** Get all online drivers */
  getOnlineDrivers(): DriverSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status !== "offline"
    );
  }

  /** Detect stale sessions (no heartbeat in timeout) */
  getStaleDrivers(): DriverSession[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      (s) => now - s.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS
    );
  }

  /** Purge stale sessions */
  purgeStale(): string[] {
    const stale = this.getStaleDrivers();
    const purged: string[] = [];
    for (const s of stale) {
      this.sessions.delete(s.driverId);
      purged.push(s.driverId);
    }
    return purged;
  }

  /** Count by status */
  getStatusCounts(): Record<DriverStatus, number> {
    const counts: Record<DriverStatus, number> = {
      online: 0, offline: 0, busy: 0, on_delivery: 0, break: 0,
    };
    for (const s of this.sessions.values()) {
      counts[s.status]++;
    }
    return counts;
  }
}

// ─── Earnings Tracker ────────────────────────────────────────────────────────

export interface EarningsSummary {
  totalEarnings: number;
  totalTips: number;
  totalMissions: number;
  completedMissions: number;
  cancelledMissions: number;
  avgEarningsPerMission: number;
  avgRating: number;
  totalDistanceKm: number;
  currency: string;
}

export interface DailyEarnings {
  date: string; // YYYY-MM-DD
  earnings: number;
  tips: number;
  missions: number;
  distanceKm: number;
}

/** Calculate earnings summary from mission history */
export function calculateEarnings(missions: Mission[]): EarningsSummary {
  if (missions.length === 0) {
    return {
      totalEarnings: 0, totalTips: 0, totalMissions: 0,
      completedMissions: 0, cancelledMissions: 0,
      avgEarningsPerMission: 0, avgRating: 0, totalDistanceKm: 0,
      currency: "EUR",
    };
  }

  const completed = missions.filter((m) => m.status === "delivered");
  const cancelled = missions.filter((m) => m.status === "cancelled");
  const totalEarnings = completed.reduce((s, m) => s + m.earnings, 0);
  const totalTips = completed.reduce((s, m) => s + m.tip, 0);
  const totalDistanceKm = completed.reduce((s, m) => s + m.distanceKm, 0);
  const ratings = completed.filter((m) => m.rating !== null).map((m) => m.rating!);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalTips: Math.round(totalTips * 100) / 100,
    totalMissions: missions.length,
    completedMissions: completed.length,
    cancelledMissions: cancelled.length,
    avgEarningsPerMission: completed.length > 0
      ? Math.round((totalEarnings / completed.length) * 100) / 100
      : 0,
    avgRating: Math.round(avgRating * 10) / 10,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    currency: missions[0]?.currency || "EUR",
  };
}

/** Group earnings by day */
export function dailyEarnings(missions: Mission[]): DailyEarnings[] {
  const completed = missions.filter((m) => m.status === "delivered" && m.deliveredAt);
  const byDay = new Map<string, DailyEarnings>();

  for (const m of completed) {
    const date = new Date(m.deliveredAt!).toISOString().slice(0, 10);
    const existing = byDay.get(date) || { date, earnings: 0, tips: 0, missions: 0, distanceKm: 0 };
    existing.earnings += m.earnings;
    existing.tips += m.tip;
    existing.missions++;
    existing.distanceKm += m.distanceKm;
    byDay.set(date, existing);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Demand Heatmap ──────────────────────────────────────────────────────────

export interface HeatmapCell {
  lat: number;
  lng: number;
  intensity: number;
  orderCount: number;
}

export interface HeatmapConfig {
  /** Grid cell size in degrees (default ~0.005 ≈ 500m) */
  cellSize: number;
  /** Minimum orders to show in heatmap */
  minOrders: number;
}

const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  cellSize: 0.005,
  minOrders: 1,
};

/** Generate demand heatmap from pickup coordinates */
export function generateHeatmap(
  pickupCoords: Array<{ lat: number; lng: number }>,
  config: HeatmapConfig = DEFAULT_HEATMAP_CONFIG
): HeatmapCell[] {
  const grid = new Map<string, { lat: number; lng: number; count: number }>();

  for (const coord of pickupCoords) {
    const cellLat = Math.round(coord.lat / config.cellSize) * config.cellSize;
    const cellLng = Math.round(coord.lng / config.cellSize) * config.cellSize;
    const key = `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`;

    const existing = grid.get(key) || { lat: cellLat, lng: cellLng, count: 0 };
    existing.count++;
    grid.set(key, existing);
  }

  const cells = Array.from(grid.values()).filter((c) => c.count >= config.minOrders);
  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  return cells.map((c) => ({
    lat: c.lat,
    lng: c.lng,
    intensity: Math.round((c.count / maxCount) * 100) / 100,
    orderCount: c.count,
  }));
}

/** Identify hot zones (top N cells by order count) */
export function getHotZones(heatmap: HeatmapCell[], topN: number = 5): HeatmapCell[] {
  return [...heatmap].sort((a, b) => b.orderCount - a.orderCount).slice(0, topN);
}

// ─── Mission State Machine ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  assigned: ["accepted", "cancelled"],
  accepted: ["heading_to_pickup", "cancelled"],
  heading_to_pickup: ["at_pickup", "cancelled"],
  at_pickup: ["in_transit", "cancelled"],
  in_transit: ["delivered", "failed"],
  delivered: [],
  cancelled: [],
  failed: [],
};

/** Check if a mission status transition is valid */
export function isValidTransition(from: MissionStatus, to: MissionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Transition a mission to a new status with timestamp */
export function transitionMission(
  mission: Mission,
  newStatus: MissionStatus,
  extra?: { cancellationReason?: string; rating?: number; tip?: number }
): Mission {
  if (!isValidTransition(mission.status, newStatus)) {
    throw new Error(`Invalid transition: ${mission.status} → ${newStatus}`);
  }

  const updated = { ...mission, status: newStatus };

  switch (newStatus) {
    case "accepted":
      updated.acceptedAt = Date.now();
      break;
    case "at_pickup":
      updated.pickedUpAt = Date.now();
      break;
    case "delivered":
      updated.deliveredAt = Date.now();
      if (extra?.rating !== undefined) updated.rating = extra.rating;
      if (extra?.tip !== undefined) updated.tip = extra.tip;
      break;
    case "cancelled":
      updated.cancelledAt = Date.now();
      if (extra?.cancellationReason) updated.cancellationReason = extra.cancellationReason;
      break;
  }

  return updated;
}
