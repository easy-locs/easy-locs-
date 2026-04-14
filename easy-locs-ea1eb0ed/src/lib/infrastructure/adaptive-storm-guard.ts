import { platformBus } from "@/lib/shared/platform-bus";

export interface PrefixProfile {
  prefix: string;
  windowCounts: number[];
  avgRate: number;
  currentWindowCount: number;
  lastAlertAt: number | null;
  totalSuppressed: number;
}

export interface StormAlert {
  prefix: string;
  currentRate: number;
  normalRate: number;
  multiplier: number;
  detectedAt: number;
}

const ANOMALY_MULTIPLIER = 3;
const WINDOW_SIZE_MS = 5_000;
const MAX_WINDOWS = 20;
const MAX_ALERTS = 200;
const ALERT_COOLDOWN_MS = 5_000;

class AdaptiveStormGuard {
  private profiles = new Map<string, PrefixProfile>();
  private alerts: StormAlert[] = [];
  private _windowInterval: ReturnType<typeof setInterval> | null = null;
  private _installed = false;
  private _unsub: (() => void) | null = null;
  private suppressedPrefixes = new Set<string>();

  private getOrCreateProfile(prefix: string): PrefixProfile {
    if (!this.profiles.has(prefix)) {
      this.profiles.set(prefix, {
        prefix,
        windowCounts: [],
        avgRate: 0,
        currentWindowCount: 0,
        lastAlertAt: null,
        totalSuppressed: 0,
      });
    }
    return this.profiles.get(prefix)!;
  }

  private extractPrefix(eventType: string): string {
    const sep = eventType.includes(":") ? ":" : ".";
    return eventType.split(sep)[0].toLowerCase();
  }

  private rotateWindows(): void {
    for (const profile of this.profiles.values()) {
      profile.windowCounts.push(profile.currentWindowCount);
      if (profile.windowCounts.length > MAX_WINDOWS) {
        profile.windowCounts.shift();
      }

      if (profile.windowCounts.length > 0) {
        profile.avgRate =
          profile.windowCounts.reduce((s, v) => s + v, 0) /
          profile.windowCounts.length;
      }

      profile.currentWindowCount = 0;
    }
  }

  trackEvent(eventType: string): StormAlert | null {
    const prefix = this.extractPrefix(eventType);
    const profile = this.getOrCreateProfile(prefix);
    profile.currentWindowCount++;

    if (profile.windowCounts.length < 3) return null;

    const now = Date.now();
    if (
      profile.lastAlertAt &&
      now - profile.lastAlertAt < ALERT_COOLDOWN_MS
    ) {
      return null;
    }

    if (
      profile.avgRate > 0 &&
      profile.currentWindowCount > profile.avgRate * ANOMALY_MULTIPLIER
    ) {
      const alert: StormAlert = {
        prefix,
        currentRate: profile.currentWindowCount,
        normalRate: Math.round(profile.avgRate * 100) / 100,
        multiplier:
          Math.round((profile.currentWindowCount / profile.avgRate) * 100) /
          100,
        detectedAt: now,
      };

      this.alerts.push(alert);
      if (this.alerts.length > MAX_ALERTS) this.alerts.shift();

      profile.lastAlertAt = now;
      this.suppressedPrefixes.add(prefix);

      platformBus.emit(
        "system:storm_detected",
        {
          prefix,
          currentRate: alert.currentRate,
          normalRate: alert.normalRate,
          multiplier: alert.multiplier,
        },
        "system",
      );

      setTimeout(() => {
        this.suppressedPrefixes.delete(prefix);
      }, ALERT_COOLDOWN_MS);

      return alert;
    }

    return null;
  }

  isSuppressed(eventType: string): boolean {
    const prefix = this.extractPrefix(eventType);
    const suppressed = this.suppressedPrefixes.has(prefix);
    if (suppressed) {
      const profile = this.profiles.get(prefix);
      if (profile) profile.totalSuppressed++;
    }
    return suppressed;
  }

  getProfile(prefix: string): PrefixProfile | undefined {
    return this.profiles.get(prefix);
  }

  getAllProfiles(): PrefixProfile[] {
    return Array.from(this.profiles.values());
  }

  getAlerts(): StormAlert[] {
    return [...this.alerts];
  }

  install(): () => void {
    if (this._installed) return () => {};
    this._installed = true;

    this._unsub = platformBus.onAll((event) => {
      this.trackEvent(event.type);
    });

    this._windowInterval = setInterval(() => {
      this.rotateWindows();
    }, WINDOW_SIZE_MS);

    return () => {
      this._installed = false;
      this._unsub?.();
      this._unsub = null;
      if (this._windowInterval) {
        clearInterval(this._windowInterval);
        this._windowInterval = null;
      }
    };
  }

  getReport(): {
    totalPrefixes: number;
    suppressedPrefixes: string[];
    totalAlerts: number;
    recentAlerts: StormAlert[];
    profiles: Array<{
      prefix: string;
      avgRate: number;
      currentWindowCount: number;
      totalSuppressed: number;
    }>;
  } {
    return {
      totalPrefixes: this.profiles.size,
      suppressedPrefixes: Array.from(this.suppressedPrefixes),
      totalAlerts: this.alerts.length,
      recentAlerts: this.alerts.slice(-10),
      profiles: Array.from(this.profiles.values()).map((p) => ({
        prefix: p.prefix,
        avgRate: Math.round(p.avgRate * 100) / 100,
        currentWindowCount: p.currentWindowCount,
        totalSuppressed: p.totalSuppressed,
      })),
    };
  }

  reset(): void {
    this.profiles.clear();
    this.alerts = [];
    this.suppressedPrefixes.clear();
    if (this._windowInterval) {
      clearInterval(this._windowInterval);
      this._windowInterval = null;
    }
    this._installed = false;
  }
}

export const adaptiveStormGuard = new AdaptiveStormGuard();
