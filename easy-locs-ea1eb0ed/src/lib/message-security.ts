/**
 * Message Security Rules Engine
 * Defines security levels, their constraints, and enforcement logic.
 * 
 * HONEST LIMITATIONS AUDIT:
 * ─────────────────────────
 * - anti_screenshot: NOT enforceable on web. CSS user-select:none + blur on visibilitychange are compensatory only.
 * - anti_screen_record: NOT enforceable on web. Same compensatory measures as screenshot.
 * - view_once: Enforceable server-side (opened_at persisted). Client can still screenshot before close.
 * - disappear_1m: Enforceable via disappear_at + cleanup cron. Client hides immediately.
 * - self_destruct_on_forward: Enforceable by blocking forward action. If forwarded, original is neutralized.
 * 
 * PLATFORM CAPABILITY MATRIX:
 * ┌────────────────────────┬──────────┬──────────┬──────────┬──────────┐
 * │ Feature                │ Desktop  │ Mobile   │ iOS PWA  │ Android  │
 * │                        │ Chrome   │ Chrome   │ Safari   │ WebView  │
 * ├────────────────────────┼──────────┼──────────┼──────────┼──────────┤
 * │ Block screenshot       │ ❌ No    │ ❌ No    │ ❌ No    │ ❌ No    │
 * │ Block screen record    │ ❌ No    │ ❌ No    │ ❌ No    │ ❌ No    │
 * │ Blur on bg/switch      │ ✅ Yes   │ ✅ Yes   │ ⚠️ Partial│ ✅ Yes   │
 * │ Block copy             │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │
 * │ Block forward          │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │
 * │ Timed auto-destroy     │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │
 * │ View-once enforcement  │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │
 * │ Watermark overlay      │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │ ✅ Yes   │
 * └────────────────────────┴──────────┴──────────┴──────────┴──────────┘
 */

export type SecurityLevel =
  | "normal"
  | "disappear_1m"
  | "view_once"
  | "anti_screenshot"
  | "anti_screen_record"
  | "self_destruct_on_forward";

export interface SecurityPolicy {
  level: SecurityLevel;
  label: string;
  emoji: string;
  description: string;
  /** Can the recipient copy message content? */
  allowCopy: boolean;
  /** Can the message be forwarded? */
  allowForward: boolean;
  /** Can the message be selected in multi-select? */
  allowMultiSelect: boolean;
  /** Is the message searchable/indexable after its lifecycle? */
  allowSearch: boolean;
  /** Should notification preview be hidden? */
  hideNotificationPreview: boolean;
  /** TTL in seconds (0 = no auto-expire) */
  ttlSeconds: number;
  /** View-once behavior */
  viewOnce: boolean;
  /** Anti-screenshot compensatory measures */
  antiScreenshot: boolean;
  /** Anti-screen-record compensatory measures */
  antiScreenRecord: boolean;
  /** Self-destruct if forwarded */
  selfDestructOnForward: boolean;
  /** Honest limitation note for the user */
  limitation: string | null;
}

/** Security policies indexed by level */
export const SECURITY_POLICIES: Record<SecurityLevel, SecurityPolicy> = {
  normal: {
    level: "normal",
    label: "Normal",
    emoji: "💬",
    description: "Standard message. No restrictions.",
    allowCopy: true,
    allowForward: true,
    allowMultiSelect: true,
    allowSearch: true,
    hideNotificationPreview: false,
    ttlSeconds: 0,
    viewOnce: false,
    antiScreenshot: false,
    antiScreenRecord: false,
    selfDestructOnForward: false,
    limitation: null,
  },
  disappear_1m: {
    level: "disappear_1m",
    label: "Disappears (1 min)",
    emoji: "⏱️",
    description: "Auto-deletes 1 minute after sending.",
    allowCopy: false,
    allowForward: false,
    allowMultiSelect: false,
    allowSearch: false,
    hideNotificationPreview: true,
    ttlSeconds: 60,
    viewOnce: false,
    antiScreenshot: false,
    antiScreenRecord: false,
    selfDestructOnForward: false,
    limitation: "Content may be read before expiration. Screenshots are possible.",
  },
  view_once: {
    level: "view_once",
    label: "View Once",
    emoji: "👁️",
    description: "Can be opened only once. No re-open.",
    allowCopy: false,
    allowForward: false,
    allowMultiSelect: false,
    allowSearch: false,
    hideNotificationPreview: true,
    ttlSeconds: 0,
    viewOnce: true,
    antiScreenshot: false,
    antiScreenRecord: false,
    selfDestructOnForward: false,
    limitation: "Screenshot possible before closing.",
  },
  anti_screenshot: {
    level: "anti_screenshot",
    label: "Protected",
    emoji: "🛡️",
    description: "Compensatory protection: blur on background, no copy, no forward.",
    allowCopy: false,
    allowForward: false,
    allowMultiSelect: false,
    allowSearch: false,
    hideNotificationPreview: true,
    ttlSeconds: 0,
    viewOnce: false,
    antiScreenshot: true,
    antiScreenRecord: false,
    selfDestructOnForward: false,
    limitation: "⚠️ True screenshot blocking is NOT possible on web browsers. Compensatory: content blurs when app goes to background, copy/forward disabled.",
  },
  anti_screen_record: {
    level: "anti_screen_record",
    label: "Max Protection",
    emoji: "🔒",
    description: "All protections combined: blur, no copy, no forward, view-once.",
    allowCopy: false,
    allowForward: false,
    allowMultiSelect: false,
    allowSearch: false,
    hideNotificationPreview: true,
    ttlSeconds: 0,
    viewOnce: true,
    antiScreenshot: true,
    antiScreenRecord: true,
    selfDestructOnForward: true,
    limitation: "⚠️ Screen recording blocking is NOT possible on web. All compensatory measures applied: blur on background, view-once, no copy/forward, auto-destroy on forward attempt.",
  },
  self_destruct_on_forward: {
    level: "self_destruct_on_forward",
    label: "No Forward",
    emoji: "💣",
    description: "Forward is blocked. Attempt destroys the original.",
    allowCopy: true,
    allowForward: false,
    allowMultiSelect: true,
    allowSearch: true,
    hideNotificationPreview: false,
    ttlSeconds: 0,
    viewOnce: false,
    antiScreenshot: false,
    antiScreenRecord: false,
    selfDestructOnForward: true,
    limitation: null,
  },
};

/** Get the security policy for a message */
export function getMessagePolicy(msg: any): SecurityPolicy {
  const level = (msg?.security_level || "normal") as SecurityLevel;
  return SECURITY_POLICIES[level] || SECURITY_POLICIES.normal;
}

/** Check if an action is allowed on a message */
export function isActionAllowed(msg: any, action: "copy" | "forward" | "select" | "search"): boolean {
  const policy = getMessagePolicy(msg);
  switch (action) {
    case "copy": return policy.allowCopy;
    case "forward": return policy.allowForward;
    case "select": return policy.allowMultiSelect;
    case "search": return policy.allowSearch;
  }
}

/** Build the insert payload fields for a given security level */
export function buildSecurityPayload(level: SecurityLevel): Record<string, any> {
  const policy = SECURITY_POLICIES[level];
  const payload: Record<string, any> = {
    security_level: level,
    anti_screenshot: policy.antiScreenshot,
    anti_screen_record: policy.antiScreenRecord,
    self_destruct_on_forward: policy.selfDestructOnForward,
    allow_copy: policy.allowCopy,
    allow_forward: policy.allowForward,
    security_policy_version: 1,
  };

  if (policy.viewOnce) {
    payload.view_once = true;
  }

  if (policy.ttlSeconds > 0) {
    const disappearAt = new Date(Date.now() + policy.ttlSeconds * 1000).toISOString();
    payload.disappear_at = disappearAt;
  }

  return payload;
}

/** Check if a message should be hidden client-side (expired, destroyed, etc.) */
export function shouldHideMessage(msg: any): boolean {
  // Destroyed
  if (msg.destroyed_at) return true;
  
  // Expired (client-side check for immediate masking)
  if (msg.disappear_at) {
    const expiry = new Date(msg.disappear_at).getTime();
    if (Date.now() > expiry) return true;
  }

  return false;
}

/** Security level options for the picker UI */
export const SECURITY_LEVEL_OPTIONS: { value: SecurityLevel; label: string; emoji: string; description: string }[] = [
  { value: "normal", label: "Normal", emoji: "💬", description: "Standard message" },
  { value: "disappear_1m", label: "1 min", emoji: "⏱️", description: "Auto-deletes after 1 minute" },
  { value: "view_once", label: "View once", emoji: "👁️", description: "Opened only once" },
  { value: "anti_screenshot", label: "Protected", emoji: "🛡️", description: "Blur + no copy/forward" },
  { value: "self_destruct_on_forward", label: "No forward", emoji: "💣", description: "Forward blocked" },
  { value: "anti_screen_record", label: "Max", emoji: "🔒", description: "All protections" },
];
