/**
 * PLATFORM GUARDS — Sprint 6 System Lockdown
 * ============================================
 * Central enforcement layer preventing bypass of canonical engines.
 * Every critical path must pass through these guards.
 */

// ── Navigation Guard ──
export function guardNavigation(path: string): { valid: boolean; reason?: string } {
  // Entity routes must use /s/:slug format
  if (path.startsWith("/shop/") || path.startsWith("/store/")) {
    const slug = path.split("/").pop();
    return {
      valid: false,
      reason: `Use canonical route /s/${slug} instead of ${path}`,
    };
  }
  return { valid: true };
}

// ── Orbit V2 Guard — blocks legacy direct messaging ──
export function guardOrbitWrite(table: string, context: "direct" | "business"): {
  allowed: boolean;
  reason?: string;
} {
  if (context === "direct") {
    if (table === "messages" || table === "conversation_threads") {
      return {
        allowed: false,
        reason: `[ORBIT GUARD] Direct messaging must use chat_messages_v2 / conversations_v2. Legacy table "${table}" is blocked for direct contexts.`,
      };
    }
  }
  return { allowed: true };
}

// ── Self-conversation Guard ──
export function guardSelfConversation(senderId: string, receiverId: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!senderId || !receiverId) {
    return { allowed: false, reason: "Missing sender or receiver ID" };
  }
  if (senderId === receiverId) {
    return { allowed: false, reason: "[SELF GUARD] Cannot create conversation with yourself" };
  }
  return { allowed: true };
}

// ── Taxonomy Guard — entity must have valid canonical taxonomy ──
export function guardTaxonomy(entity: {
  vertical?: string | null;
  subcategory?: string | null;
}): { valid: boolean; reason?: string } {
  if (!entity.vertical) {
    return { valid: false, reason: "Entity missing canonical vertical" };
  }
  return { valid: true };
}

// ── Entity Creation Guard ──
export function guardEntityCreation(entity: {
  name?: string;
  vertical?: string | null;
  city?: string | null;
  country?: string | null;
}): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!entity.name?.trim()) reasons.push("Missing name");
  if (!entity.vertical) reasons.push("Missing vertical taxonomy");
  if (!entity.city && !entity.country) reasons.push("Missing geo context");
  return { valid: reasons.length === 0, reasons };
}

// ── I18n Guard — warn if hardcoded string in critical UI ──
const CRITICAL_PATTERNS = /^(Search|Loading|No results|Error|Submit|Cancel|Save|Delete|Back|Next|Previous|Close|Open|Add|Remove|Edit|Update|Create)$/i;

export function guardI18n(text: string, componentName?: string): void {
  if (import.meta.env.DEV && CRITICAL_PATTERNS.test(text.trim())) {
    console.warn(
      `[I18N GUARD] Possible hardcoded text "${text}" in ${componentName || "unknown component"}. Use tc() or td().`
    );
  }
}

// ── Anti-Parallel Ads Guard ──
const BANNED_AD_COMPONENTS = new Set([
  "SponsoredSlot",
  "SponsoredBanner",
  "useAdTracking",
  "ad-slots",
  "sponsored-ranking",
]);

export function guardNoExternalAds(componentName: string): {
  allowed: boolean;
  reason?: string;
} {
  if (BANNED_AD_COMPONENTS.has(componentName)) {
    return {
      allowed: false,
      reason: `[ADS GUARD] Component "${componentName}" is banned. Use Canonical Boost Engine only.`,
    };
  }
  return { allowed: true };
}


const CRITICAL_ACTIONS = new Set([
  "send_message",
  "create_conversation",
  "create_booking",
  "create_order",
  "payment_initiated",
  "entity_opened",
  "search_executed",
  "radar_scan",
]);

const emittedActions = new Set<string>();

export function trackCriticalAction(action: string): void {
  emittedActions.add(action);
}

export function auditMissedEvents(): string[] {
  const missed: string[] = [];
  for (const action of CRITICAL_ACTIONS) {
    if (!emittedActions.has(action)) {
      missed.push(action);
    }
  }
  return missed;
}

export function resetActionTracking(): void {
  emittedActions.clear();
}
