/**
 * Multi-Device Sync — Cross-device message reconciliation via platformBus.
 * Listens to realtime events and merges into the canonical store.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { applyVersion } from "./flow-core";

export type SyncEventType = "message_new" | "message_update" | "message_delete" | "typing" | "presence";

export interface SyncEvent {
  type: SyncEventType;
  conversationId: string;
  message?: any;
  deviceId?: string;
}

// Device fingerprint (unique per browser tab)
const DEVICE_ID = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function getDeviceId(): string {
  return DEVICE_ID;
}

/**
 * Install the multi-device sync listener.
 * Deduplicate events from the same device.
 */
export function installMultiDeviceSync(
  onMessage: (msg: any, conversationId: string) => void,
): () => void {
  const unsub = platformBus.on("orbit:message_sent" as any, (event) => {
    const payload = event.payload as any;
    
    // Skip events from this device
    if (payload?.deviceId === DEVICE_ID) return;
    // Skip preview events (only process server-confirmed)
    if (payload?.preview) return;
    
    if (payload?.message && payload?.conversationId) {
      onMessage(payload.message, payload.conversationId);
    }
  });

  return unsub;
}

/**
 * Broadcast a message to other devices/tabs.
 */
export function broadcastToDevices(conversationId: string, message: any): void {
  platformBus.emit("orbit:message_sent" as any, {
    conversationId,
    message,
    deviceId: DEVICE_ID,
    type: "multi_device_sync",
  }, "orbit");
}
