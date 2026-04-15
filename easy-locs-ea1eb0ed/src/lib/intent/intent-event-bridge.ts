import { platformBus } from "@/lib/shared/platform-bus";
import { detectIntent } from "./intent-engine";
import { resolveRoute } from "./domain-router";
import type { IntentContext, CanonicalEntityType, EntityVertical } from "./intent-types";

type NavigateFn = (path: string) => void;

let _navigate: NavigateFn | null = null;

export function setIntentNavigate(fn: NavigateFn) {
  _navigate = fn;
}

function handleNavigation(path: string) {
  if (!_navigate) {
    if (import.meta.env.DEV) {
      console.warn("[intent-bridge] Navigate not initialized, queuing:", path);
    }
    return;
  }
  _navigate(path);
}

function resolveAndRoute(ctx: IntentContext) {
  const intent = detectIntent(ctx);
  const result = resolveRoute(intent);

  if (import.meta.env.DEV) {
    console.log("[intent-bridge]", ctx.metadata?.source ?? "unknown", "→", {
      intent: intent.action,
      route: result.path,
      confidence: intent.confidence,
    });
  }

  if (result.action === "navigate" && result.path) {
    handleNavigation(result.path);
  }

  if (result.action === "event") {
    platformBus.emit(`intent:${intent.action}`, {
      entityId: intent.entityId,
      entityType: intent.entityType,
      vertical: intent.vertical,
      source: intent.source,
    }, "intent");
  }

  return intent;
}

function handleStoryCTA(payload: Record<string, unknown>) {
  resolveAndRoute({
    entityId: String(payload.entityId ?? ""),
    entityType: String(payload.entityType ?? "merchant") as CanonicalEntityType,
    vertical: String(payload.vertical ?? "") as EntityVertical,
    categoryKey: payload.categoryKey as string | undefined,
    subcategoryKey: payload.subcategoryKey as string | undefined,
    ctaType: payload.ctaType as string | undefined,
    feedKey: payload.feedKey as string | undefined,
    surface: "story",
    metadata: { storyId: payload.storyId, source: "story.cta.clicked" },
  });
}

function handleEntityClick(payload: Record<string, unknown>) {
  resolveAndRoute({
    entityId: String(payload.entityId ?? ""),
    entityType: String(payload.entityType ?? "merchant") as CanonicalEntityType,
    vertical: String(payload.vertical ?? "") as EntityVertical,
    surface: "direct",
    metadata: { source: "entity.click" },
  });
}

function handleWalletAction(payload: Record<string, unknown>) {
  const action = String(payload.action ?? "");
  const context = String(payload.context ?? "");

  const WALLET_DIRECT_ROUTES: Record<string, string> = {
    scan: "/pay/scan",
    link: "/pay/link-resolver",
    request: "/wallet/request",
  };

  if (WALLET_DIRECT_ROUTES[context]) {
    handleNavigation(WALLET_DIRECT_ROUTES[context]);
    return;
  }

  const intentHintMap: Record<string, string> = {
    transfer: "wallet_transfer",
    send: "wallet_transfer",
    pay: "wallet_payment",
    topup: "wallet_topup",
    "top-up": "wallet_topup",
    receive: "wallet_transfer",
  };

  resolveAndRoute({
    entityId: String(payload.recipientId ?? payload.merchantId ?? ""),
    entityType: (payload.entityType as CanonicalEntityType) ?? "merchant",
    vertical: "shops",
    ctaType: action,
    intentHint: intentHintMap[action] ?? "wallet_transfer",
    surface: "wallet",
    metadata: { source: "wallet.action", originalAction: action, amount: payload.amount },
  });
}

function handleOrbitAction(payload: Record<string, unknown>) {
  const action = String(payload.action ?? "open");
  const isSupport = action === "support" || payload.context === "support";

  resolveAndRoute({
    entityId: String(payload.threadId ?? payload.entityId ?? ""),
    entityType: (payload.entityType as CanonicalEntityType) ?? "merchant",
    vertical: String(payload.vertical ?? "services") as EntityVertical,
    ctaType: isSupport ? "support" : "thread",
    surface: "orbit",
    metadata: { source: "orbit.action", threadContext: payload.context },
  });
}

function handleRadarAction(payload: Record<string, unknown>) {
  resolveAndRoute({
    entityId: String(payload.entityId ?? ""),
    entityType: String(payload.entityType ?? "merchant") as CanonicalEntityType,
    vertical: String(payload.vertical ?? "") as EntityVertical,
    ctaType: "open",
    surface: "radar",
    metadata: { source: "radar.action", lat: payload.lat, lng: payload.lng },
  });
}

function handleDashboardAction(payload: Record<string, unknown>) {
  resolveAndRoute({
    entityId: String(payload.entityId ?? ""),
    entityType: String(payload.entityType ?? "merchant") as CanonicalEntityType,
    vertical: String(payload.vertical ?? "") as EntityVertical,
    ctaType: payload.ctaType as string | undefined,
    surface: "dashboard",
    feedKey: payload.feedKey as string | undefined,
    metadata: { source: "dashboard.action" },
  });
}

function handleSearchExecuted(payload: Record<string, unknown>) {
  resolveAndRoute({
    entityId: "",
    entityType: "merchant",
    vertical: String(payload.vertical ?? "") as EntityVertical,
    searchQuery: String(payload.query ?? ""),
    surface: "search",
    metadata: { source: "search.executed" },
  });
}

export function installIntentBridge() {
  platformBus.on("story:cta_clicked", (e) => handleStoryCTA(e.payload as Record<string, unknown>));
  platformBus.on("entity:click", (e) => handleEntityClick(e.payload as Record<string, unknown>));
  platformBus.on("wallet:action", (e) => handleWalletAction(e.payload as Record<string, unknown>));
  platformBus.on("orbit:action", (e) => handleOrbitAction(e.payload as Record<string, unknown>));
  platformBus.on("radar:action", (e) => handleRadarAction(e.payload as Record<string, unknown>));
  platformBus.on("dashboard:action", (e) => handleDashboardAction(e.payload as Record<string, unknown>));
  platformBus.on("search:executed", (e) => handleSearchExecuted(e.payload as Record<string, unknown>));

  if (import.meta.env.DEV) {
    console.log("[intent-bridge] Installed — listening to story:cta_clicked, entity:click, wallet:action, orbit:action, radar:action, dashboard:action, search:executed");
  }
}
