export interface RateLimiterConfig {
  webhookMaxPerMinute: number;
  agentRunMaxPerMinute: number;
  apiMaxPerMinute: number;
}

interface SlidingWindow {
  timestamps: number[];
  maxPerMinute: number;
}

export class RateLimiter {
  private windows = new Map<string, SlidingWindow>();
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      webhookMaxPerMinute: config.webhookMaxPerMinute ?? 30,
      agentRunMaxPerMinute: config.agentRunMaxPerMinute ?? 10,
      apiMaxPerMinute: config.apiMaxPerMinute ?? 60,
    };
  }

  checkWebhook(source: string): { allowed: boolean; retryAfterMs?: number } {
    return this.check(`webhook:${source}`, this.config.webhookMaxPerMinute);
  }

  checkAgentRun(agentRole: string): { allowed: boolean; retryAfterMs?: number } {
    return this.check(`agent:${agentRole}`, this.config.agentRunMaxPerMinute);
  }

  checkAPI(endpoint: string): { allowed: boolean; retryAfterMs?: number } {
    return this.check(`api:${endpoint}`, this.config.apiMaxPerMinute);
  }

  private check(key: string, maxPerMinute: number): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const windowMs = 60_000;

    let window = this.windows.get(key);
    if (!window) {
      window = { timestamps: [], maxPerMinute };
      this.windows.set(key, window);
    }

    window.timestamps = window.timestamps.filter((ts) => now - ts < windowMs);

    if (window.timestamps.length >= maxPerMinute) {
      const oldestInWindow = window.timestamps[0];
      const retryAfterMs = windowMs - (now - oldestInWindow);
      return { allowed: false, retryAfterMs };
    }

    window.timestamps.push(now);
    return { allowed: true };
  }

  getStats(): Record<string, { current: number; limit: number }> {
    const now = Date.now();
    const stats: Record<string, { current: number; limit: number }> = {};
    for (const [key, window] of this.windows) {
      const active = window.timestamps.filter((ts) => now - ts < 60_000);
      stats[key] = { current: active.length, limit: window.maxPerMinute };
    }
    return stats;
  }
}
