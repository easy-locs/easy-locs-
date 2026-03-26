/**
 * Notification Delivery Policy — decides push/realtime/in_app by type and priority.
 */

type DeliveryMode = "in_app" | "realtime" | "push" | "silent_badge";

interface DeliveryPolicy {
  modes: DeliveryMode[];
  showToast: boolean;
  playSound: boolean;
  vibrate: boolean;
}

const PRIORITY_POLICIES: Record<string, DeliveryPolicy> = {
  critical: { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true },
  high: { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true },
  normal: { modes: ["in_app", "realtime"], showToast: true, playSound: false, vibrate: false },
  low: { modes: ["in_app"], showToast: false, playSound: false, vibrate: false },
};

/** Resolve delivery policy for a notification */
export function resolveDeliveryPolicy(priority: string, type: string): DeliveryPolicy {
  // Override for specific types regardless of priority
  if (type === "orbit.incoming_call") {
    return { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true };
  }
  if (type === "rider.new_offer") {
    return { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true };
  }
  return PRIORITY_POLICIES[priority] ?? PRIORITY_POLICIES.normal;
}
