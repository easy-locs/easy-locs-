/**
 * Signaling channel — Supabase Realtime broadcast for WebRTC signaling.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SignalPayload } from "./types";

export class SignalingChannel {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private _ready = false;
  private userId: string;
  private callId: string;
  private onSignal: (signal: SignalPayload) => void;

  constructor(callId: string, userId: string, onSignal: (signal: SignalPayload) => void) {
    this.callId = callId;
    this.userId = userId;
    this.onSignal = onSignal;
  }

  get ready() { return this._ready; }

  async join(): Promise<void> {
    this.channel = supabase.channel(`call:${this.callId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const signal = payload as SignalPayload;
      if (signal.from === this.userId) return;
      this.onSignal(signal);
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Channel subscription timeout")), 10_000);

      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          this._ready = true;
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          reject(new Error(`Channel subscription failed: ${status}`));
        }
      });
    });
  }

  send(signal: Omit<SignalPayload, "from">) {
    if (!this._ready || !this.channel) return;
    void this.channel.send({
      type: "broadcast",
      event: "signal",
      payload: { ...signal, from: this.userId } as SignalPayload,
    }).catch(() => {});
  }

  destroy() {
    this._ready = false;
    if (this.channel) {
      try { supabase.removeChannel(this.channel); } catch {}
      this.channel = null;
    }
  }
}
