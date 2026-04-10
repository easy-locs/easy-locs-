import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { supabase } from "@/integrations/supabase/client";

export class PresenceHealthEngine extends BaseEngine {
  private lastChannelCount = 0;

  constructor() {
    super({
      id: "rt-presence-health",
      name: "Presence Health Engine",
      category: "realtime",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const channels = supabase.getChannels();
    const channelCount = channels.length;

    if (channelCount > 20) {
      findings.push(`High channel count: ${channelCount} active channels`);
    }

    if (this.lastChannelCount > 0 && channelCount > this.lastChannelCount + 5) {
      findings.push(`Channel leak: grew from ${this.lastChannelCount} to ${channelCount}`);
    }
    this.lastChannelCount = channelCount;

    let unhealthy = 0;
    for (const ch of channels) {
      const state = (ch as any).state;
      if (state === "errored" || state === "closed") {
        unhealthy++;
      }
    }
    if (unhealthy > 0) {
      findings.push(`${unhealthy}/${channelCount} channels in error/closed state`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions, duration: 0 };
  }
}
