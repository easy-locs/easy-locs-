import { platformBus } from "@/lib/shared/platform-bus";
import { initIntelligence, getIntelligenceOrchestrator } from "./intelligence-orchestrator";
import { logBrokenRoute, logFeedRejection, logBrokenCTA } from "./anti-error-logger";
import {
  logFallbackUsage as logFallbackUsageValidation,
  logMediaValidation,
} from "@/lib/validation/validation-logger";
import { validateImage } from "@/lib/validation/media-validator";
import { getDefaultFamilyForVertical } from "@/lib/validation/media-families";
import { rejectIncompatibleImage } from "@/lib/image/media-validator";
import type { ImageMetadata } from "@/lib/validation/types";
import type { UserContext } from "./types";

export function bootIntelligenceLayer() {
  const hour = new Date().getHours();
  const timeOfDay: UserContext["timeOfDay"] =
    hour >= 5 && hour < 12 ? "morning" :
    hour >= 12 && hour < 17 ? "afternoon" :
    hour >= 17 && hour < 21 ? "evening" : "night";

  const orchestrator = initIntelligence({
    currency: "AED",
    language: "en",
    timeOfDay,
    recentVerticals: [],
    recentSearches: [],
    sessionStart: Date.now(),
  });

  platformBus.on("entity:click", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const vertical = String(payload.vertical ?? "");
    if (vertical) {
      const ctx = orchestrator.getContext();
      const recents = ctx.recentVerticals ?? [];
      if (recents[0] !== vertical) {
        orchestrator.updateContext({
          recentVerticals: [vertical, ...recents.filter((v) => v !== vertical)].slice(0, 5),
        });
      }
    }
  });

  platformBus.on("search:executed", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const query = String(payload.query ?? "");
    if (query) {
      const ctx = orchestrator.getContext();
      const searches = ctx.recentSearches ?? [];
      orchestrator.updateContext({
        recentSearches: [query, ...searches.filter((s) => s !== query)].slice(0, 10),
      });
    }
  });

  const CTA_TO_CANONICAL_INTENT: Record<string, string> = {
    open: "",
    orbit: "",
    wallet: "wallet_transfer",
    map: "",
    save: "",
    share: "",
    transfer: "wallet_transfer",
    pay: "wallet_payment",
    topup: "wallet_topup",
    support: "support_request",
    thread: "",
    viewing: "buy_property",
  };

  const VERTICAL_TO_INTENT: Record<string, string> = {
    property: "buy_property",
    stay: "stay_booking",
    food: "food_order",
    grocery: "grocery_order",
    services: "service_request",
    mobility: "ride_request",
    utility: "service_request",
    beauty: "service_request",
    pharmacy: "grocery_order",
    shops: "shop_browse",
  };

  platformBus.on("story:cta_clicked", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const vertical = String(payload.vertical ?? "");
    if (vertical) {
      const ctx = orchestrator.getContext();
      const recents = ctx.recentVerticals ?? [];
      const ctaType = String(payload.ctaType ?? "open");
      const canonicalIntent = CTA_TO_CANONICAL_INTENT[ctaType] || VERTICAL_TO_INTENT[vertical] || undefined;

      orchestrator.updateContext({
        recentVerticals: [vertical, ...recents.filter((v) => v !== vertical)].slice(0, 5),
        activeIntent: canonicalIntent || ctx.activeIntent,
      });
    }
  });

  platformBus.on("intent:broken_route", (event) => {
    const payload = event.payload as Record<string, unknown>;
    logBrokenRoute(String(payload.path ?? ""), String(payload.source ?? ""), String(payload.reason ?? "unknown"));
  });

  platformBus.on("intent:broken_cta", (event) => {
    const payload = event.payload as Record<string, unknown>;
    logBrokenCTA(String(payload.entityId ?? ""), String(payload.ctaType ?? ""), String(payload.reason ?? "unknown"));
  });

  platformBus.on("feed:rejection", (event) => {
    const payload = event.payload as Record<string, unknown>;
    logFeedRejection(String(payload.entityId ?? ""), String(payload.feedKey ?? ""), String(payload.reason ?? "domain_mismatch"));
  });

  platformBus.on("media:validate", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const vertical = String(payload.vertical ?? "food");
    const meta: ImageMetadata = {
      url: String(payload.url ?? ""),
      width: typeof payload.width === "number" ? payload.width : undefined,
      height: typeof payload.height === "number" ? payload.height : undefined,
      format: typeof payload.format === "string" ? payload.format : undefined,
      sizeBytes: typeof payload.sizeBytes === "number" ? payload.sizeBytes : undefined,
    };
    const expectedFamily = getDefaultFamilyForVertical(vertical);
    const result = validateImage(meta, expectedFamily, String(payload.entityName ?? ""), vertical);
    logMediaValidation(String(payload.entityId ?? ""), result);
  });

  platformBus.on("media:fallback_used", (event) => {
    const payload = event.payload as Record<string, unknown>;
    logFallbackUsageValidation(
      String(payload.entityId ?? ""),
      String(payload.vertical ?? ""),
      String(payload.fallbackUrl ?? ""),
    );
  });

  platformBus.on("media:assign", (event) => {
    const payload = event.payload as Record<string, unknown>;
    const vertical = String(payload.vertical ?? "");
    const subcategory = String(payload.subcategory ?? "");
    const imageUrl = String(payload.imageUrl ?? "");
    if (vertical && imageUrl) {
      const check = rejectIncompatibleImage(vertical, subcategory, imageUrl);
      if (!check.accepted) {
        console.warn(`[media-validator] REJECTED image for ${vertical}:${subcategory} — ${check.reason}`);
        platformBus.emit("media:rejected", {
          vertical,
          subcategory,
          imageUrl,
          reason: check.reason,
          replacement: check.replacement,
        }, "system");
      }
    }
  });

  if (import.meta.env.DEV) {
    console.log("[intelligence] Boot complete — orchestrator active, anti-error logging wired");
    console.log("[validation] System active — media families, entity quality, story/feed gates ready");
  }

  return orchestrator;
}
