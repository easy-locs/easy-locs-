/**
 * Notification Delivery Policy — decides push/realtime/in_app by type and priority.
 */

type DeliveryMode = "in_app" | "realtime" | "push" | "email" | "sms" | "silent_badge";

interface DeliveryPolicy {
  modes: DeliveryMode[];
  showToast: boolean;
  playSound: boolean;
  vibrate: boolean;
}

const PRIORITY_POLICIES: Record<string, DeliveryPolicy> = {
  critical: { modes: ["in_app", "realtime", "push", "email", "sms"], showToast: true, playSound: true, vibrate: true },
  high: { modes: ["in_app", "realtime", "push", "email"], showToast: true, playSound: true, vibrate: true },
  normal: { modes: ["in_app", "realtime"], showToast: true, playSound: false, vibrate: false },
  low: { modes: ["in_app"], showToast: false, playSound: false, vibrate: false },
};

const TYPE_OVERRIDES: Record<string, DeliveryPolicy> = {
  "orbit.incoming_call": { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true },
  "orbit.message": { modes: ["in_app", "realtime"], showToast: true, playSound: true, vibrate: false },
  "orbit.voice_message": { modes: ["in_app", "realtime"], showToast: true, playSound: true, vibrate: true },
  "orbit.media": { modes: ["in_app", "realtime"], showToast: true, playSound: true, vibrate: false },
  "orbit.missed_call": { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true },
  "rider.new_offer": { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true },
  "payment.received": { modes: ["in_app", "realtime", "push"], showToast: true, playSound: true, vibrate: true },
  "payment.sent": { modes: ["in_app", "realtime"], showToast: true, playSound: true, vibrate: false },
};

/** Resolve delivery policy for a notification */
export function resolveDeliveryPolicy(priority: string, type: string): DeliveryPolicy {
  if (TYPE_OVERRIDES[type]) return TYPE_OVERRIDES[type];
  return PRIORITY_POLICIES[priority] ?? PRIORITY_POLICIES.normal;
}
