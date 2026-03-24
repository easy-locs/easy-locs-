/**
 * PLATFORM AUTO-FIX ENGINE
 * Detects and automatically corrects safe platform issues.
 * Never touches business data (wallet, payments, orders).
 * Extended: visual quality checks for shops.
 */

import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { supabase } from "@/integrations/supabase/client";

export interface AutoFixResult {
  fix: string;
  applied: boolean;
  detail: string;
}

// ── Individual auto-fixes ───────────────────────────────────

/** Fix: geo stuck in loading/unknown — retry */
function fixGeoStuck(): AutoFixResult {
  const geo = useGeoStore.getState();
  if (!geo.tracking && geo.permission !== "denied" && !geo.point) {
    geoService.forceRetry();
    return { fix: "geo_retry", applied: true, detail: "Geo was stuck, forced retry" };
  }
  if (geo.permission === "denied") {
    return { fix: "geo_retry", applied: false, detail: "Geo denied by user, cannot auto-fix" };
  }
  return { fix: "geo_retry", applied: false, detail: "Geo is healthy" };
}

/** Fix: raw i18n keys visible in DOM */
function fixRawI18nKeys(): AutoFixResult {
  if (typeof document === "undefined") return { fix: "i18n_raw_keys", applied: false, detail: "No DOM" };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const rawPattern = /^(discovery|common|travel|orbit|wallet|settings|admin|boost)\.[a-z_]+\.[a-z_]+/i;
  let fixed = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent?.trim() ?? "";
    if (text && rawPattern.test(text)) {
      const segments = text.split(".");
      const last = segments[segments.length - 1];
      const humanized = last
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
      node.textContent = humanized;
      fixed++;
    }
  }

  return {
    fix: "i18n_raw_keys",
    applied: fixed > 0,
    detail: fixed > 0 ? `Humanized ${fixed} raw keys in DOM` : "No raw keys found",
  };
}

/** Fix: hardcoded "AED" amounts in DOM — audit only */
function auditHardcodedCurrency(): AutoFixResult {
  if (typeof document === "undefined") return { fix: "hardcoded_currency", applied: false, detail: "No DOM" };

  const allText = document.body?.innerText ?? "";
  const matches = allText.match(/\bAED\s+\d|\d+\s+AED\b/g) ?? [];

  return {
    fix: "hardcoded_currency",
    applied: false,
    detail: matches.length > 3
      ? `⚠️ ${matches.length} hardcoded AED instances detected (requires code fix)`
      : "Currency usage acceptable",
  };
}

/** Fix: stores not hydrated — trigger rehydration */
async function fixStoreHydration(): Promise<AutoFixResult> {
  try {
    const { useOrbitStore } = await import("@/stores/orbitStore");
    const { useWalletStore } = await import("@/stores/walletStore");
    const orbit = useOrbitStore.getState();
    const wallet = useWalletStore.getState();

    if (orbit.profile && !wallet.wallet) {
      await wallet.loadWallet({
        walletId: `wallet_${orbit.profile.orbitId}`,
        ownerOrbitId: orbit.profile.id,
        currency: "AED",
      });
      return { fix: "store_hydration", applied: true, detail: "Wallet rehydrated for active profile" };
    }
    return { fix: "store_hydration", applied: false, detail: "Stores consistent" };
  } catch (e: any) {
    return { fix: "store_hydration", applied: false, detail: `Store check failed: ${e?.message}` };
  }
}

/** Fix: dead route detection */
function fixDeadRoute(): AutoFixResult {
  const path = window.location.hash?.replace("#", "") || window.location.pathname;
  const deadPatterns = ["/dispatch", "/growth", "/dino"];
  const hit = deadPatterns.find(d => path.startsWith(d));

  if (hit) {
    return { fix: "dead_route", applied: false, detail: `⚠️ User on dead route: ${hit}` };
  }
  return { fix: "dead_route", applied: false, detail: "Route is valid" };
}

/** Visual check: shops missing cover, logo, or menu */
async function auditShopVisualHealth(): Promise<AutoFixResult> {
  try {
    const { data: states } = await (supabase as any)
      .from("merchant_onboarding_state")
      .select("entity_id, ui_quality_status, menu_visual_status, storefront_ready_status, visual_flags_json")
      .in("ui_quality_status", ["needs_assets", "pending"])
      .limit(100);

    if (!states?.length) {
      return { fix: "shop_visual_health", applied: false, detail: "All shops have acceptable visual quality" };
    }

    const needsLogo = states.filter((s: any) => s.visual_flags_json?.missing_logo).length;
    const needsCover = states.filter((s: any) => s.visual_flags_json?.missing_cover).length;
    const poorMenu = states.filter((s: any) => s.menu_visual_status === "poor").length;
    const emptyMenu = states.filter((s: any) => s.menu_visual_status === "empty").length;

    return {
      fix: "shop_visual_health",
      applied: false,
      detail: `Visual audit: ${needsLogo} missing logo, ${needsCover} missing cover, ${poorMenu} poor menus, ${emptyMenu} empty menus (${states.length} total flagged)`,
    };
  } catch (e: any) {
    return { fix: "shop_visual_health", applied: false, detail: `Visual audit failed: ${e?.message}` };
  }
}

// ── Main auto-fix orchestrator ──────────────────────────────

export async function runAutoFix(): Promise<AutoFixResult[]> {
  const results: AutoFixResult[] = [];

  // Sync fixes
  results.push(fixGeoStuck());
  results.push(fixRawI18nKeys());
  results.push(auditHardcodedCurrency());
  results.push(fixDeadRoute());

  // Async fixes
  results.push(await fixStoreHydration());
  results.push(await auditShopVisualHealth());

  const applied = results.filter(r => r.applied);
  if (applied.length > 0) {
    console.log(
      `%c🔧 Auto-Fix: ${applied.length} fixes applied`,
      "color: #f59e0b; font-weight: bold",
      applied.map(r => r.fix)
    );
  }

  return results;
}
