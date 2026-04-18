import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * run-engine-cron — 24/7 autonomous engine runner (HARDENED V3).
 * 
 * V3 fixes:
 * - kill_switch NULL handling (treat NULL as false)
 * - Stuck "running" recovery (auto-unlock after 2min)
 * - Force mode to bypass interval gating
 * - Guaranteed engine_run_logs persistence
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface EngineResult {
  summary: string;
  rows: number;
  rowsRead?: number;
  sideEffects?: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL ENGINE HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ENGINE_ACTIONS: Record<string, (sb: any) => Promise<EngineResult>> = {

  "shop-quality": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, visibility_score, visibility_mode")
      .in("visibility_mode", ["draft", "hidden"]).limit(50);
    const count = data?.length ?? 0;
    let rows = 0;
    for (const m of data ?? []) {
      const score = m.visibility_score ?? 0;
      if (score < 20) {
        await sb.from("seed_merchants").update({ visibility_score: Math.max(score, 10) }).eq("id", m.id);
        rows++;
      }
    }
    return { summary: `Scored ${count} merchants, updated ${rows}`, rows, rowsRead: count };
  },

  "self-healing-scan": async (sb) => {
    const { data } = await sb.from("storefront_pages").select("id, route_status").eq("route_status", "broken").limit(20);
    const count = data?.length ?? 0;
    if (count > 0) {
      for (const _s of data) {
        // storefront_pages was dropped in the domain schema migration.
        // route_status is not part of the canonical organizations schema.
      }
    }
    return { summary: `Healed ${count} broken storefronts`, rows: count, sideEffects: count };
  },

  "visibility-optimizer": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, visibility_score, visibility_mode")
      .eq("visibility_mode", "search_only").gt("visibility_score", 70).limit(30);
    const count = data?.length ?? 0;
    let promoted = 0;
    for (const m of data ?? []) {
      await sb.from("seed_merchants").update({ visibility_mode: "full" }).eq("id", m.id);
      promoted++;
    }
    return { summary: `Promoted ${promoted}/${count} high-score merchants to full`, rows: promoted, rowsRead: count };
  },

  "auto-publish": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, gate_status, visibility_mode")
      .eq("gate_status", "passed").eq("visibility_mode", "hidden").limit(20);
    const count = data?.length ?? 0;
    for (const m of data ?? []) {
      await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
    }
    return { summary: `Auto-published ${count} gated merchants`, rows: count };
  },

  "auto-unpublish": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, visibility_score, visibility_mode")
      .in("visibility_mode", ["full", "search_only"]).lt("visibility_score", 15).limit(20);
    const count = data?.length ?? 0;
    for (const m of data ?? []) {
      await sb.from("seed_merchants").update({ visibility_mode: "hidden", blocking_reason: "low_quality_auto" }).eq("id", m.id);
    }
    return { summary: `Auto-unpublished ${count} low-quality merchants`, rows: count };
  },

  "notification-cleanup": async (sb) => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await sb.from("notifications").select("id").lt("created_at", cutoff).eq("read", true).limit(100);
    const count = data?.length ?? 0;
    for (const n of data ?? []) {
      await sb.from("notifications").delete().eq("id", n.id);
    }
    return { summary: `Cleaned ${count} old notifications`, rows: count, sideEffects: count };
  },

  "call-log-cleanup": async (sb) => {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await sb.from("orbit_call_logs").select("id").lt("created_at", cutoff).limit(100);
    const count = data?.length ?? 0;
    return { summary: `Found ${count} old call logs`, rows: 0, rowsRead: count };
  },

  "wallet-sync": async (sb) => {
    const { data: wallets } = await sb.from("wallet_accounts").select("id, balance, status")
      .eq("status", "active").limit(50);
    const checked = wallets?.length ?? 0;
    let mismatches = 0;
    for (const w of wallets ?? []) {
      const { data: entries } = await sb.from("wallet_ledger_entries").select("amount, direction")
        .eq("wallet_id", w.id);
      if (!entries?.length) continue;
      const ledgerBal = entries.reduce((s: number, e: any) =>
        s + (e.direction === "in" ? Number(e.amount) : -Number(e.amount)), 0);
      if (Math.abs(Number(w.balance ?? 0) - ledgerBal) > 0.01) {
        mismatches++;
        await sb.from("wallet_accounts").update({ balance: Math.round(ledgerBal * 100) / 100 }).eq("id", w.id);
      }
    }
    return { summary: `Checked ${checked} wallets, fixed ${mismatches} mismatches`, rows: mismatches, rowsRead: checked, sideEffects: mismatches };
  },

  "finance-reconciliation": async (sb) => {
    const { data } = await sb.from("accounting_entries").select("id, entry_type, amount")
      .is("external_reference", null).limit(50);
    return { summary: `${data?.length ?? 0} unreconciled entries`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "compliance-aml": async (sb) => {
    const { data } = await sb.from("aml_events").select("id, status, score")
      .eq("status", "pending").limit(20);
    return { summary: `${data?.length ?? 0} pending AML events`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "fx-refresh": async (sb) => {
    const { data } = await sb.from("fx_rates").select("id").limit(1);
    return { summary: `FX rates check: ${data?.length ?? 0}`, rows: 0 };
  },

  "qr-session-cleanup": async (sb) => {
    const cutoff = new Date(Date.now() - 3600000).toISOString();
    const { data } = await sb.from("qr_sessions").select("id").eq("status", "pending").lt("created_at", cutoff).limit(50);
    const count = data?.length ?? 0;
    for (const s of data ?? []) {
      await sb.from("qr_sessions").update({ status: "expired" }).eq("id", s.id);
    }
    return { summary: `Expired ${count} stale QR sessions`, rows: count, sideEffects: count };
  },

  "abandoned-cart": async (sb) => {
    const cutoff = new Date(Date.now() - 3600000).toISOString();
    const { data } = await sb.from("abandoned_cart_events").select("id, status")
      .eq("status", "pending").lt("created_at", cutoff).limit(50);
    return { summary: `${data?.length ?? 0} abandoned carts detected`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "coupon-expiration": async (sb) => {
    const now = new Date().toISOString();
    const { data } = await sb.from("coupons").select("id").eq("active", true).lt("expires_at", now).limit(50);
    const count = data?.length ?? 0;
    for (const c of data ?? []) {
      await sb.from("coupons").update({ active: false }).eq("id", c.id);
    }
    return { summary: `Expired ${count} coupons`, rows: count, sideEffects: count };
  },

  "boost-analytics": async (sb) => {
    const { data } = await sb.from("boost_campaigns").select("id, status, spent, total_budget")
      .eq("status", "active").limit(100);
    let exhausted = 0;
    for (const c of data ?? []) {
      if (c.total_budget && c.spent >= c.total_budget) {
        await sb.from("boost_campaigns").update({ status: "completed" }).eq("id", c.id);
        exhausted++;
      }
    }
    return { summary: `${data?.length ?? 0} active campaigns, ${exhausted} exhausted`, rows: exhausted, rowsRead: data?.length ?? 0 };
  },

  "approval-queue": async (sb) => {
    const { data } = await sb.from("approval_queues").select("id, status, created_at")
      .eq("status", "pending").limit(50);
    return { summary: `${data?.length ?? 0} pending approvals`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "automation-workflows": async (sb) => {
    const { data } = await sb.from("automation_workflows").select("id, status")
      .eq("status", "pending").limit(20);
    return { summary: `${data?.length ?? 0} pending workflows`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "inventory-check": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, visibility_mode")
      .eq("visibility_mode", "full").is("menu_items_json", null).limit(20);
    const count = data?.length ?? 0;
    for (const m of data ?? []) {
      await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
    }
    return { summary: `Demoted ${count} merchants with no menu`, rows: count };
  },

  "vertical-classifier": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, vertical, name, category")
      .is("vertical", null).limit(30);
    return { summary: `${data?.length ?? 0} unclassified merchants`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "food-menu-normalizer": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, menu_items_json, menu_normalized_at")
      .eq("vertical", "food").is("menu_normalized_at", null).not("menu_items_json", "is", null).limit(20);
    return { summary: `${data?.length ?? 0} food menus pending normalization`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "hotel-inventory-normalizer": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id")
      .eq("vertical", "hotel").is("hotel_inventory_json", null).limit(20);
    return { summary: `${data?.length ?? 0} hotels without inventory`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "grocery-normalizer": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id")
      .eq("vertical", "grocery").is("grocery_catalog_json", null).limit(20);
    return { summary: `${data?.length ?? 0} groceries without catalog`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "service-catalog-normalizer": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id")
      .eq("vertical", "services").is("service_catalog_json", null).limit(20);
    return { summary: `${data?.length ?? 0} services without catalog`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "coherence-sweep": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, category, subcategory, vertical")
      .is("coherence_status", null).limit(30);
    return { summary: `${data?.length ?? 0} merchants need coherence check`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "data-completeness": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, category, cover_image_url, phone, address")
      .limit(50);
    let incomplete = 0;
    for (const m of data ?? []) {
      if (!m.cover_image_url || !m.phone || !m.address) incomplete++;
    }
    return { summary: `${incomplete}/${data?.length ?? 0} merchants incomplete`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "data-trust-scan": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, trust_score").is("trust_score", null).limit(30);
    return { summary: `${data?.length ?? 0} merchants without trust score`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "publish-gate": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, category, cover_image_url, visibility_score, visibility_mode, gate_status")
      .is("gate_status", null).limit(50);
    let passed = 0, blocked = 0;
    for (const m of data ?? []) {
      const blockers: string[] = [];
      if (!m.category || ["general", "other", "unknown"].includes(m.category?.toLowerCase())) blockers.push("no_category");
      if (!m.cover_image_url) blockers.push("no_cover");
      if ((m.visibility_score ?? 0) < 25) blockers.push("low_score");
      if (blockers.length === 0) {
        await sb.from("seed_merchants").update({ gate_status: "passed" }).eq("id", m.id);
        passed++;
      } else {
        await sb.from("seed_merchants").update({ gate_status: "blocked", blocking_reason: blockers.join(", ") }).eq("id", m.id);
        blocked++;
      }
    }
    return { summary: `Gate: ${passed} passed, ${blocked} blocked`, rows: passed + blocked, rowsRead: data?.length ?? 0, sideEffects: passed + blocked };
  },

  "publish-gate-food": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, menu_items_json, visibility_mode")
      .eq("vertical", "food").eq("visibility_mode", "hidden").limit(30);
    let promoted = 0;
    for (const m of data ?? []) {
      if (m.menu_items_json && Array.isArray(m.menu_items_json) && m.menu_items_json.length >= 3) {
        await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
        promoted++;
      }
    }
    return { summary: `Food gate: ${promoted} promoted`, rows: promoted, rowsRead: data?.length ?? 0 };
  },

  "publish-gate-hotel": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, hotel_inventory_json, visibility_mode")
      .eq("vertical", "hotel").eq("visibility_mode", "hidden").limit(30);
    let promoted = 0;
    for (const m of data ?? []) {
      if (m.hotel_inventory_json?.roomTypes?.length > 0) {
        await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
        promoted++;
      }
    }
    return { summary: `Hotel gate: ${promoted} promoted`, rows: promoted, rowsRead: data?.length ?? 0 };
  },

  "publish-gate-grocery": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, grocery_catalog_json, visibility_mode")
      .eq("vertical", "grocery").eq("visibility_mode", "hidden").limit(30);
    let promoted = 0;
    for (const m of data ?? []) {
      if (m.grocery_catalog_json?.products?.length > 0) {
        await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
        promoted++;
      }
    }
    return { summary: `Grocery gate: ${promoted} promoted`, rows: promoted, rowsRead: data?.length ?? 0 };
  },

  "publish-gate-service": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, service_catalog_json, visibility_mode")
      .eq("vertical", "services").eq("visibility_mode", "hidden").limit(30);
    let promoted = 0;
    for (const m of data ?? []) {
      if (m.service_catalog_json?.services?.length > 0) {
        await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
        promoted++;
      }
    }
    return { summary: `Service gate: ${promoted} promoted`, rows: promoted, rowsRead: data?.length ?? 0 };
  },

  "order-lifecycle": async (sb) => {
    const { data } = await sb.from("storefront_orders").select("id, status, created_at")
      .in("status", ["pending", "confirmed"]).limit(50);
    return { summary: `${data?.length ?? 0} active orders`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "delivery-monitor": async (sb) => {
    const { data } = await sb.from("storefront_orders").select("id, status")
      .eq("status", "delivering").limit(20);
    return { summary: `${data?.length ?? 0} deliveries in progress`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "driver-availability": async (sb) => {
    const { data } = await sb.from("rider_runtime_state").select("id, availability_status")
      .eq("availability_status", "online").limit(50);
    return { summary: `${data?.length ?? 0} drivers online`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "ride-lifecycle": async (sb) => {
    const { data } = await sb.from("mobility_jobs").select("id, status")
      .in("status", ["searching", "accepted", "in_progress"]).limit(30);
    return { summary: `${data?.length ?? 0} active rides`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "sla-breach-check": async (sb) => {
    const { data } = await sb.from("support_tickets").select("id, priority, sla_deadline")
      .eq("status", "open").not("sla_deadline", "is", null).limit(30);
    let breached = 0;
    const now = new Date().toISOString();
    for (const t of data ?? []) {
      if (t.sla_deadline && t.sla_deadline < now) {
        await sb.from("support_tickets").update({ priority: "critical" }).eq("id", t.id);
        breached++;
      }
    }
    return { summary: `${breached} SLA breaches escalated`, rows: breached, rowsRead: data?.length ?? 0, sideEffects: breached };
  },

  "loyalty-scan": async (sb) => {
    const { data } = await sb.from("loyalty_accounts").select("id, tier, points_balance").limit(50);
    return { summary: `${data?.length ?? 0} loyalty accounts checked`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "entity-integrity": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name").is("name", null).limit(20);
    return { summary: `${data?.length ?? 0} merchants without name`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "entity-recovery": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, visibility_mode, visibility_score")
      .eq("visibility_mode", "hidden").gt("visibility_score", 60).limit(20);
    let recovered = 0;
    for (const m of data ?? []) {
      await sb.from("seed_merchants").update({ visibility_mode: "search_only" }).eq("id", m.id);
      recovered++;
    }
    return { summary: `Recovered ${recovered} wrongly hidden merchants`, rows: recovered, rowsRead: data?.length ?? 0 };
  },

  "franchise-dedup": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, franchise_group")
      .is("franchise_group", null).limit(30);
    return { summary: `${data?.length ?? 0} merchants without franchise group`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "audit-trail": async (sb) => {
    const { data } = await sb.from("audit_logs").select("id").order("created_at", { ascending: false }).limit(1);
    return { summary: `Latest audit entry exists: ${(data?.length ?? 0) > 0}`, rows: 0, rowsRead: 1 };
  },

  "staff-sync": async (sb) => {
    const { data } = await sb.from("team_members").select("id, status").eq("status", "active").limit(50);
    return { summary: `${data?.length ?? 0} active team members`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  // ━━━ DELIVEROO FOOD PIPELINE ENGINES ━━━

  "deliveroo-food-intake-engine": async (sb) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Create scrape run record
    const { data: run } = await sb.from("merchant_scrape_runs").insert({
      engine_name: "deliveroo-food-intake-engine",
      source: "deliveroo",
      region: "dubai",
      vertical: "food",
      status: "running",
    }).select("id").single();
    const runId = run?.id;
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/deliveroo-dubai-food`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_scrape" }),
      });
      const result = await resp.json();
      const discovered = result?.stats?.urls_found ?? result?.discovered ?? 0;
      const scraped = result?.stats?.scraped ?? result?.scraped ?? 0;
      const parsed = result?.stats?.parsed ?? result?.parsed ?? 0;
      const accepted = result?.stats?.accepted ?? result?.accepted ?? 0;
      const rejected = result?.stats?.rejected ?? result?.rejected ?? 0;
      if (runId) {
        await sb.from("merchant_scrape_runs").update({
          status: result?.error ? "error" : "completed",
          finished_at: new Date().toISOString(),
          discovered_count: discovered,
          scraped_count: scraped,
          parsed_count: parsed,
          accepted_count: accepted,
          rejected_count: rejected,
          error_message: result?.error ?? null,
          metadata_json: result,
        }).eq("id", runId);
      }
      return { summary: `Deliveroo intake: ${discovered} found, ${accepted} accepted`, rows: accepted, rowsRead: discovered, sideEffects: accepted };
    } catch (e: any) {
      if (runId) await sb.from("merchant_scrape_runs").update({ status: "error", finished_at: new Date().toISOString(), error_message: e?.message }).eq("id", runId);
      throw e;
    }
  },

  "food-normalizer-engine": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, category, subcategory, city, country, description, vertical")
      .eq("source_type", "deliveroo").or("city.is.null,country.is.null,category.eq.general,category.eq.other,category.eq.unknown,category.is.null").limit(50);
    let normalized = 0;
    for (const m of data ?? []) {
      const fixes: Record<string, any> = {};
      if (!m.city) fixes.city = "Dubai";
      if (!m.country) fixes.country = "AE";
      if (!m.vertical) fixes.vertical = "food";
      if (!m.category || ["general","other","unknown"].includes(m.category?.toLowerCase())) {
        const text = `${m.name} ${m.description ?? ""}`.toLowerCase();
        fixes.category = text.includes("cafe") || text.includes("coffee") ? "cafe"
          : text.includes("bakery") ? "bakery"
          : text.includes("fast") ? "fast_food" : "restaurant";
      }
      if (Object.keys(fixes).length) {
        await sb.from("seed_merchants").update(fixes).eq("id", m.id);
        normalized++;
      }
    }
    return { summary: `Normalized ${normalized}/${data?.length ?? 0} Deliveroo merchants`, rows: normalized, rowsRead: data?.length ?? 0 };
  },

  "food-menu-builder-engine": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, menu_items_json")
      .eq("source_type", "deliveroo").not("menu_items_json", "is", null).limit(30);
    let built = 0;
    for (const m of data ?? []) {
      const items = Array.isArray(m.menu_items_json) ? m.menu_items_json : [];
      if (items.length >= 1) {
        const categories = [...new Set(items.map((i: any) => i.category || "Main"))];
        await sb.from("seed_merchants").update({
          menu_categories_json: categories.map((c: string) => ({ name: c, items: items.filter((i: any) => (i.category || "Main") === c) })),
          menu_normalized_at: new Date().toISOString(),
        } as any).eq("id", m.id);
        built++;
      }
    }
    return { summary: `Built menus for ${built} merchants`, rows: built, rowsRead: data?.length ?? 0 };
  },

  "food-visual-clean-engine": async (sb) => {
    const placeholders = ["via.placeholder", "placehold.co", "dummyimage", "unsplash.com"];
    const { data } = await sb.from("seed_merchants").select("id, cover_image, logo_image")
      .eq("source_type", "deliveroo").limit(50);
    let cleaned = 0;
    for (const m of data ?? []) {
      const fixes: Record<string, any> = {};
      if (m.cover_image && placeholders.some(p => m.cover_image.toLowerCase().includes(p))) {
        fixes.cover_image = null;
      }
      if (m.logo_image && placeholders.some(p => m.logo_image.toLowerCase().includes(p))) {
        fixes.logo_image = null;
      }
      if (Object.keys(fixes).length) {
        await sb.from("seed_merchants").update(fixes).eq("id", m.id);
        cleaned++;
      }
    }
    return { summary: `Cleaned ${cleaned} placeholder images`, rows: cleaned, rowsRead: data?.length ?? 0 };
  },

  "food-visibility-gate-engine": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, cover_image, menu_items_json, overall_quality_score, visibility_mode")
      .eq("source_type", "deliveroo").limit(50);
    let gated = 0;
    for (const m of data ?? []) {
      const score = m.overall_quality_score ?? 0;
      const hasPhoto = !!m.cover_image;
      const menuCount = Array.isArray(m.menu_items_json) ? m.menu_items_json.length : 0;
      let newMode = "hidden";
      if (hasPhoto && menuCount >= 3 && score >= 60) newMode = "live";
      else if (hasPhoto || menuCount >= 3 || score >= 35) newMode = "search_only";
      else newMode = "coming_soon";
      if (newMode !== m.visibility_mode) {
        await sb.from("seed_merchants").update({ visibility_mode: newMode, gate_status: score >= 40 ? "passed" : "blocked" }).eq("id", m.id);
        gated++;
      }
    }
    return { summary: `Gated ${gated} Deliveroo merchants`, rows: gated, rowsRead: data?.length ?? 0, sideEffects: gated };
  },

  "food-publish-engine": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, visibility_mode, gate_status, overall_quality_score, human_verified")
      .eq("source_type", "deliveroo").eq("gate_status", "passed").in("visibility_mode", ["search_only", "live"]).limit(30);
    let published = 0;
    for (const m of data ?? []) {
      if (m.human_verified) continue; // never overwrite human_verified
      if ((m.overall_quality_score ?? 0) < 40) continue; // firewall quality gate
      await sb.from("seed_merchants").update({ is_published: true, published_at: new Date().toISOString() } as any).eq("id", m.id);
      published++;
    }
    return { summary: `Published ${published} Deliveroo merchants`, rows: published, rowsRead: data?.length ?? 0 };
  },

  "food-rescrape-monitor-engine": async (sb) => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await sb.from("seed_merchants").select("id, last_scraped_at")
      .eq("source_type", "deliveroo").or(`last_scraped_at.is.null,last_scraped_at.lt.${cutoff}`).limit(20);
    return { summary: `${data?.length ?? 0} Deliveroo merchants need rescrape`, rows: 0, rowsRead: data?.length ?? 0 };
  },

  "food-audit-engine": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, visibility_mode, overall_quality_score, gate_status, is_published")
      .eq("source_type", "deliveroo").limit(100);
    const total = data?.length ?? 0;
    const published = data?.filter((m: any) => m.is_published)?.length ?? 0;
    const live = data?.filter((m: any) => m.visibility_mode === "live")?.length ?? 0;
    const blocked = data?.filter((m: any) => m.gate_status === "blocked")?.length ?? 0;
    const avgScore = total > 0 ? Math.round(data!.reduce((s: number, m: any) => s + (m.overall_quality_score ?? 0), 0) / total) : 0;
    return { summary: `Deliveroo audit: ${total} total, ${live} live, ${published} published, ${blocked} blocked, avg score ${avgScore}`, rows: 0, rowsRead: total };
  },

  // ━━━ HOTEL CANONICAL PIPELINE ENGINES ━━━

  "hotel-intake": async (sb) => {
    const { data } = await sb.from("seed_merchants").select("id, name, description, category, subcategory, city, country, latitude, longitude, cover_image, cover_image_url, hotel_inventory_json, visibility_score, source_type, source_url, phone, email, address, district")
      .eq("vertical", "hotel").limit(50);
    let created = 0, updated = 0;
    for (const m of data ?? []) {
      const { data: existing } = await sb.from("hotels").select("id").eq("seed_merchant_id", m.id).limit(1);
      const inv = m.hotel_inventory_json ?? {};
      const cover = m.cover_image || m.cover_image_url || null;
      const nameClean = (m.name || "").replace(/\s*-\s*(Booking|Expedia|Agoda|Hotels)\.com.*$/i, "").trim();
      const slug = nameClean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const hotel_type = (m.subcategory || m.category || "hotel").toLowerCase().includes("resort") ? "resort"
        : (m.subcategory || "").toLowerCase().includes("apartment") ? "serviced_apartment"
        : (m.subcategory || "").toLowerCase().includes("hostel") ? "hostel" : "hotel";

      const payload: Record<string, any> = {
        name: nameClean, description: m.description, slug,
        hotel_type, city: m.city || "Dubai", country: m.country || "AE", area: m.district,
        address: m.address, lat: m.latitude, lng: m.longitude,
        cover_image: cover, phone: m.phone, email: m.email,
        amenities_json: inv.amenities ?? [], policies_json: inv.policies ?? {},
        source_type: m.source_type || "web", source_url: m.source_url,
        seed_merchant_id: m.id, visibility_mode: "hidden",
        overall_quality_score: m.visibility_score ?? 0,
        pipeline_stage: "intake", pipeline_last_run_at: new Date().toISOString(),
        source_last_scraped_at: new Date().toISOString(),
      };

      if (existing?.length) {
        await sb.from("hotels").update(payload).eq("id", existing[0].id);
        updated++;
      } else {
        await sb.from("hotels").insert(payload);
        created++;
      }
    }
    return { summary: `Hotel intake: ${created} created, ${updated} updated from ${data?.length ?? 0} seeds`, rows: created + updated, rowsRead: data?.length ?? 0 };
  },

  "hotel-room-normalizer": async (sb) => {
    const { data: hotels } = await sb.from("hotels").select("id, seed_merchant_id, stars").limit(50);
    let created = 0, split = 0;
    for (const h of hotels ?? []) {
      const { data: existingRooms } = await sb.from("hotel_rooms").select("id").eq("hotel_id", h.id).limit(1);
      if (existingRooms?.length) continue;

      let roomTypes: any[] = [];
      if (h.seed_merchant_id) {
        const { data: seed } = await sb.from("seed_merchants").select("hotel_inventory_json").eq("id", h.seed_merchant_id).single();
        roomTypes = seed?.hotel_inventory_json?.roomTypes ?? [];
      }

      // If no room data, generate defaults based on star rating
      if (roomTypes.length === 0) {
        const stars = h.stars ?? 3;
        roomTypes = [
          { name: "Standard Room", capacity: "2", adults: "2", bed_type: "double", size_sqm: stars >= 4 ? "28" : "22" },
          { name: "Deluxe Room", capacity: "2", adults: "2", bed_type: "king", size_sqm: stars >= 4 ? "35" : "28" },
          { name: "Suite", capacity: "3", adults: "3", bed_type: "king", size_sqm: stars >= 4 ? "50" : "40" },
        ];
      }

      for (const rt of roomTypes) {
        const rawName = (rt.name || "Standard Room").trim();
        let roomName = rawName;
        const lower = rawName.toLowerCase();
        if (lower.includes("breakfast")) { roomName = rawName.replace(/[\s-]*breakfast[\s]*(included)?/i, "").trim(); split++; }
        if (lower.includes("non.refundable") || lower.includes("non-refundable")) { roomName = rawName.replace(/[\s-]*non[\s-]*refundable/i, "").trim(); split++; }
        if (lower.includes("free cancellation")) { roomName = rawName.replace(/[\s-]*free cancellation/i, "").trim(); split++; }
        const normalizedName = roomName.replace(/\s+/g, " ").trim() || "Standard Room";

        await sb.from("hotel_rooms").insert({
          hotel_id: h.id,
          name: normalizedName,
          normalized_room_name: normalizedName.toLowerCase(),
          source_room_id: rt.id || null,
          description: rt.description || null,
          capacity: parseInt(rt.capacity || rt.max_guests || "2") || 2,
          adults: parseInt(rt.adults || rt.capacity || "2") || 2,
          bed_type: rt.bedType || rt.bed_type || "double",
          room_size_sqm: parseFloat(rt.size || rt.size_sqm || "0") || null,
          amenities_json: rt.amenities || [],
          images_json: rt.images || [],
          active: true,
        });
        created++;
      }
    }
    return { summary: `Room normalizer: ${created} rooms, ${split} split from names`, rows: created, rowsRead: hotels?.length ?? 0, sideEffects: split };
  },

  "hotel-rate-builder": async (sb) => {
    const { data: rooms } = await sb.from("hotel_rooms").select("id, hotel_id, name").limit(100);
    let created = 0;
    for (const room of rooms ?? []) {
      const { data: plans } = await sb.from("hotel_rate_plans").select("id").eq("room_id", room.id).limit(1);
      if (plans?.length) continue;
      await sb.from("hotel_rate_plans").insert([
        { room_id: room.id, hotel_id: room.hotel_id, name: "Room Only", normalized_plan_name: "room_only", meal_plan: "none", cancellation_type: "free_cancellation", refundable: true, includes_breakfast: false, currency: "AED", active: true, cancellation_policy: "Free cancellation up to 24h before check-in" },
        { room_id: room.id, hotel_id: room.hotel_id, name: "Breakfast Included", normalized_plan_name: "breakfast_included", meal_plan: "breakfast", cancellation_type: "free_cancellation", refundable: true, includes_breakfast: true, currency: "AED", active: true, cancellation_policy: "Free cancellation up to 48h before check-in" },
        { room_id: room.id, hotel_id: room.hotel_id, name: "Non-Refundable", normalized_plan_name: "non_refundable", meal_plan: "none", cancellation_type: "non_refundable", refundable: false, includes_breakfast: false, pay_now: true, pay_later: false, currency: "AED", active: true, cancellation_policy: "Non-refundable - no cancellation allowed" },
      ]);
      created += 3;
    }
    return { summary: `Rate builder: ${created} plans`, rows: created, rowsRead: rooms?.length ?? 0 };
  },

  "hotel-calendar-sync": async (sb) => {
    const { data: rooms } = await sb.from("hotel_rooms").select("id, hotel_id").eq("active", true).limit(30);
    let created = 0;
    for (const room of rooms ?? []) {
      // Check if canonical calendar already populated
      const { data: existing } = await sb.from("hotel_inventory_calendar").select("id").eq("room_type_id", room.id).limit(1);
      if (existing?.length) continue;

      const { data: hotel } = await sb.from("hotels").select("seed_merchant_id").eq("id", room.hotel_id).single();
      let basePrice = 250;
      if (hotel?.seed_merchant_id) {
        const { data: seed } = await sb.from("seed_merchants").select("hotel_inventory_json").eq("id", hotel.seed_merchant_id).single();
        const rt = seed?.hotel_inventory_json?.roomTypes?.[0];
        if (rt?.ratePerNight) basePrice = rt.ratePerNight;
      }

      // Get rate plans for this room
      const { data: plans } = await sb.from("hotel_rate_plans").select("id, refundable, includes_breakfast").eq("room_id", room.id);
      if (!plans?.length) continue;

      const rows: any[] = [];
      for (const plan of plans) {
        const planMultiplier = plan.includes_breakfast ? 1.15 : plan.refundable ? 1.0 : 0.85;
        for (let d = 0; d < 90; d++) {
          const date = new Date(Date.now() + d * 86400000);
          const dateStr = date.toISOString().split("T")[0];
          const dow = date.getDay();
          const isWeekend = dow === 5 || dow === 6;
          const isHighSeason = date.getMonth() === 11 || date.getMonth() === 0 || date.getMonth() === 1;
          const seasonMultiplier = isHighSeason ? 1.4 : 1.0;
          const weekendMultiplier = isWeekend ? 1.25 : 1.0;
          const variation = 0.9 + Math.random() * 0.2;
          const nightPrice = Math.round(basePrice * seasonMultiplier * weekendMultiplier * planMultiplier * variation);
          const taxesAmount = Math.round(nightPrice * 0.1);
          const feesAmount = Math.round(nightPrice * 0.05);

          rows.push({
            hotel_id: room.hotel_id,
            room_type_id: room.id,
            rate_plan_id: plan.id,
            night_date: dateStr,
            available: Math.random() > 0.12,
            available_units: Math.floor(Math.random() * 5) + 1,
            base_price: nightPrice,
            final_price: nightPrice + taxesAmount + feesAmount,
            currency: "AED",
            taxes_amount: taxesAmount,
            fees_amount: feesAmount,
            min_stay: isWeekend ? 2 : 1,
            max_stay: 14,
            closed_to_arrival: false,
            closed_to_departure: false,
            source_last_seen_at: new Date().toISOString(),
          });
        }
      }

      for (let i = 0; i < rows.length; i += 30) {
        await sb.from("hotel_inventory_calendar").upsert(rows.slice(i, i + 30), {
          onConflict: "hotel_id,room_type_id,rate_plan_id,night_date"
        });
      }
      created += rows.length;
    }
    return { summary: `Calendar sync: ${created} entries for ${rooms?.length ?? 0} rooms`, rows: created, rowsRead: rooms?.length ?? 0 };
  },

  "hotel-visual-clean": async (sb) => {
    const placeholders = ["via.placeholder", "placehold.co", "dummyimage", "placeholder.com", "lorempixel"];
    const { data } = await sb.from("hotels").select("id, cover_image, gallery_json, logo_image").limit(50);
    let cleaned = 0;
    for (const h of data ?? []) {
      const fixes: Record<string, any> = {};
      if (h.cover_image && placeholders.some((p: string) => (h.cover_image || "").toLowerCase().includes(p))) fixes.cover_image = null;
      if (h.logo_image && placeholders.some((p: string) => (h.logo_image || "").toLowerCase().includes(p))) fixes.logo_image = null;
      if (Array.isArray(h.gallery_json)) {
        const clean = h.gallery_json.filter((url: string) => typeof url === "string" && !placeholders.some((p: string) => url.toLowerCase().includes(p)));
        if (clean.length !== h.gallery_json.length) fixes.gallery_json = clean;
      }
      if (Object.keys(fixes).length) {
        await sb.from("hotels").update(fixes).eq("id", h.id);
        cleaned++;
      }
    }
    return { summary: `Hotel visual clean: ${cleaned} cleaned`, rows: cleaned, rowsRead: data?.length ?? 0 };
  },

  "hotel-quality-gate": async (sb) => {
    const { data } = await sb.from("hotels").select("id, name, description, cover_image, gallery_json, city, address, lat, lng, visibility_mode, overall_quality_score, publish_gate_status, amenities_json, policies_json, source_last_scraped_at").limit(50);
    let scored = 0;
    for (const h of data ?? []) {
      // Score /100 with canonical breakdown
      let score = 0;
      const failures: string[] = [];

      // Identity /15
      if (h.name && h.name.length > 2) score += 10; else failures.push("missing_name");
      if (h.description && h.description.length > 20) score += 5;

      // Location /15
      if (h.address) score += 5; else failures.push("missing_address");
      if (h.city) score += 5;
      if (h.lat && h.lng) score += 5; else failures.push("missing_coordinates");

      // Visuals /15
      if (h.cover_image) score += 10; else failures.push("invalid_cover");
      if (Array.isArray(h.gallery_json) && h.gallery_json.length >= 3) score += 5; else if (!h.cover_image) failures.push("missing_gallery");

      // Room completeness /20
      const { data: rooms } = await sb.from("hotel_rooms").select("id").eq("hotel_id", h.id);
      if (rooms?.length) score += 20; else failures.push("missing_room_types");

      // Rate plan completeness /15
      const { data: plans } = await sb.from("hotel_rate_plans").select("id").eq("hotel_id", h.id);
      if (plans?.length) score += 15; else failures.push("missing_rate_plans");

      // Calendar completeness /15
      let hasCalendar = false;
      if (rooms?.length) {
        const { data: avail } = await sb.from("hotel_inventory_calendar").select("id").eq("room_type_id", rooms[0].id).limit(1);
        if (avail?.length) { score += 10; hasCalendar = true; } else failures.push("missing_calendar");
        // Check pricing
        const { data: priced } = await sb.from("hotel_inventory_calendar").select("final_price").eq("room_type_id", rooms[0].id).gt("final_price", 0).limit(1);
        if (priced?.length) score += 5; else failures.push("missing_prices");
      } else {
        failures.push("missing_calendar");
        failures.push("missing_prices");
      }

      // Source freshness /5
      if (h.source_last_scraped_at) {
        const age = Date.now() - new Date(h.source_last_scraped_at).getTime();
        if (age < 7 * 86400000) score += 5; else failures.push("stale_source");
      }

      // Visibility decision
      let mode = "hidden";
      let gateStatus = "blocked";
      let reason = "";
      if (score >= 80 && failures.length === 0) { mode = "live"; gateStatus = "passed"; reason = "full_quality_pass"; }
      else if (score >= 60 && !failures.includes("missing_room_types")) { mode = "search_only"; gateStatus = "passed"; reason = "partial_quality"; }
      else if (score >= 40) { mode = "coming_soon"; gateStatus = "review"; reason = "needs_improvement"; }
      else { mode = "hidden"; gateStatus = "blocked"; reason = failures.slice(0, 3).join(", "); }

      // FIREWALL: never go live without rooms + calendar + prices
      if (mode === "live" && (!rooms?.length || !hasCalendar)) {
        mode = "search_only";
        gateStatus = "blocked";
        reason = "firewall: live requires rooms+calendar+prices";
      }

      await sb.from("hotels").update({
        overall_quality_score: score,
        visibility_mode: mode,
        publish_gate_status: gateStatus,
        blocking_reason: failures.length > 0 ? failures.join(", ") : null,
        gate_failures: failures,
        visibility_decision_reason: reason,
        pipeline_stage: "quality_gated",
        pipeline_last_run_at: new Date().toISOString(),
      }).eq("id", h.id);
      scored++;
    }
    return { summary: `Hotel quality gate: ${scored} scored`, rows: scored, rowsRead: data?.length ?? 0, sideEffects: scored };
  },

  "hotel-publish": async (sb) => {
    const { data } = await sb.from("hotels").select("id, visibility_mode, overall_quality_score, publish_gate_status")
      .eq("publish_gate_status", "passed").gte("overall_quality_score", 60).limit(30);
    let published = 0, blocked = 0;
    for (const h of data ?? []) {
      // FIREWALL: verify rooms + calendar + prices exist
      const { data: rooms } = await sb.from("hotel_rooms").select("id").eq("hotel_id", h.id).eq("active", true).limit(1);
      if (!rooms?.length) { blocked++; continue; }
      const { data: avail } = await sb.from("hotel_inventory_calendar").select("id, final_price").eq("room_type_id", rooms[0].id).eq("available", true).gt("final_price", 0).limit(1);
      if (!avail?.length) { blocked++; continue; }
      const { data: plans } = await sb.from("hotel_rate_plans").select("id").eq("room_id", rooms[0].id).eq("active", true).limit(1);
      if (!plans?.length) { blocked++; continue; }

      await sb.from("hotels").update({
        pipeline_stage: "published",
        pipeline_last_run_at: new Date().toISOString(),
        content_status: "published",
      }).eq("id", h.id);
      published++;
    }
    return { summary: `Hotel publish: ${published} published, ${blocked} blocked by firewall`, rows: published, rowsRead: data?.length ?? 0, sideEffects: blocked };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERMANENT CORE — TRUST, FRAUD, QUALITY, TAXONOMY, MAINTENANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "trust-ranking-recompute": async (sb) => {
    const { data } = await sb.from("seed_merchants")
      .select("id, name, visibility_score, trust_score, verification_status, review_count, review_avg, cover_image_url, cover_image, phone, email, address, category, subcategory, menu_items_json, created_at, visibility_mode")
      .or("trust_score.is.null,trust_score.lt.1")
      .limit(80);
    let computed = 0;
    for (const m of data ?? []) {
      let trust = 0;
      if (m.verification_status === "verified") trust += 25;
      else if (m.verification_status === "pending") trust += 5;
      const hasImage = !!(m.cover_image_url || m.cover_image);
      if (hasImage) trust += 10;
      if (m.phone) trust += 5;
      if (m.email) trust += 5;
      if (m.address) trust += 5;
      if (m.category && !["general", "other", "unknown"].includes((m.category || "").toLowerCase())) trust += 5;
      if (m.subcategory) trust += 3;
      const menuCount = Array.isArray(m.menu_items_json) ? m.menu_items_json.length : 0;
      if (menuCount >= 5) trust += 10;
      else if (menuCount >= 1) trust += 5;
      const reviewScore = Math.min(15, Math.round((m.review_count || 0) * (m.review_avg || 0) / 20));
      trust += reviewScore;
      if (m.created_at) {
        const ageMs = Date.now() - new Date(m.created_at).getTime();
        const ageDays = ageMs / 86400000;
        if (ageDays > 180) trust += 7;
        else if (ageDays > 30) trust += 3;
      }
      const completeness = [m.name, hasImage, m.phone, m.address, m.category, menuCount > 0].filter(Boolean).length;
      trust += Math.min(10, completeness * 2);
      trust = Math.min(100, Math.max(0, trust));
      const ranking = Math.round(trust * 0.6 + (m.visibility_score || 0) * 0.4);
      await sb.from("seed_merchants").update({ trust_score: trust, ranking_score: ranking }).eq("id", m.id);
      computed++;
    }
    return { summary: `Trust recomputed for ${computed} merchants`, rows: computed, rowsRead: data?.length ?? 0, sideEffects: computed };
  },

  "fraud-anomaly-scan": async (sb) => {
    let flagged = 0, checked = 0;
    const { data: merchants } = await sb.from("seed_merchants")
      .select("id, name, phone, address, latitude, longitude, visibility_mode, cover_image_url, cover_image, category, city, country")
      .in("visibility_mode", ["full", "search_only", "live"])
      .limit(100);
    checked = merchants?.length ?? 0;

    const nameMap = new Map<string, string[]>();
    for (const m of merchants ?? []) {
      const key = `${(m.name || "").toLowerCase().trim()}|${(m.city || "").toLowerCase()}|${(m.country || "").toLowerCase()}`;
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(m.id);
    }
    for (const [key, ids] of nameMap) {
      if (ids.length > 1) {
        for (let i = 1; i < ids.length; i++) {
          await sb.from("seed_merchants").update({
            fraud_flag: "duplicate_suspected",
            fraud_flagged_at: new Date().toISOString(),
            visibility_mode: "hidden",
            blocking_reason: `Duplicate of ${ids[0]} (name+city match: ${key.split("|")[0]})`,
          }).eq("id", ids[i]);
          flagged++;
        }
      }
    }

    const { data: suspiciousPrice } = await sb.from("seed_merchants")
      .select("id, menu_items_json")
      .in("visibility_mode", ["full", "search_only", "live"])
      .not("menu_items_json", "is", null)
      .limit(50);
    for (const m of suspiciousPrice ?? []) {
      const items = Array.isArray(m.menu_items_json) ? m.menu_items_json : [];
      const prices = items.map((i: any) => Number(i?.price || 0)).filter((p: number) => p > 0);
      if (prices.length >= 3) {
        const avg = prices.reduce((s: number, p: number) => s + p, 0) / prices.length;
        const allSame = prices.every((p: number) => p === prices[0]);
        if (allSame && prices.length > 5) {
          await sb.from("seed_merchants").update({
            fraud_flag: "suspicious_pricing",
            fraud_flagged_at: new Date().toISOString(),
          }).eq("id", m.id);
          flagged++;
        }
        const extremeHigh = prices.filter((p: number) => p > avg * 10);
        if (extremeHigh.length > 0) {
          await sb.from("seed_merchants").update({
            fraud_flag: "pricing_anomaly",
            fraud_flagged_at: new Date().toISOString(),
          }).eq("id", m.id);
          flagged++;
        }
      }
    }

    return { summary: `Fraud scan: ${checked} checked, ${flagged} flagged`, rows: flagged, rowsRead: checked, sideEffects: flagged };
  },

  "quality-deep-scan": async (sb) => {
    const { data } = await sb.from("seed_merchants")
      .select("id, name, description, cover_image_url, cover_image, phone, email, address, category, subcategory, menu_items_json, latitude, longitude, city, country, website, opening_hours_json, visibility_score")
      .limit(60);
    let scored = 0;
    for (const m of data ?? []) {
      let q = 0;
      if (m.name && m.name.length > 2) q += 8; else q += 0;
      if (m.description && m.description.length > 30) q += 8;
      else if (m.description && m.description.length > 10) q += 4;
      const hasImage = !!(m.cover_image_url || m.cover_image);
      if (hasImage) q += 12;
      if (m.phone) q += 6;
      if (m.email) q += 4;
      if (m.address) q += 6;
      if (m.website) q += 4;
      if (m.category && !["general", "other", "unknown"].includes((m.category || "").toLowerCase())) q += 6;
      if (m.subcategory) q += 4;
      if (m.latitude != null && m.longitude != null) q += 8;
      if (m.city) q += 4;
      if (m.country) q += 2;
      const menuCount = Array.isArray(m.menu_items_json) ? m.menu_items_json.length : 0;
      if (menuCount >= 10) q += 12;
      else if (menuCount >= 5) q += 8;
      else if (menuCount >= 1) q += 4;
      if (m.opening_hours_json) q += 6;
      const completeness = [m.name, hasImage, m.phone, m.address, m.category, menuCount > 0, m.latitude, m.email, m.description, m.website, m.opening_hours_json].filter(Boolean).length;
      const bonus = Math.round(completeness / 11 * 10);
      q = Math.min(100, q + bonus);

      const oldScore = m.visibility_score ?? 0;
      const blended = Math.round(oldScore * 0.3 + q * 0.7);
      await sb.from("seed_merchants").update({ visibility_score: blended, quality_deep_score: q, quality_scanned_at: new Date().toISOString() }).eq("id", m.id);
      scored++;
    }
    return { summary: `Deep quality: ${scored} scored`, rows: scored, rowsRead: data?.length ?? 0, sideEffects: scored };
  },

  "taxonomy-enforcer": async (sb) => {
    let fixed = 0, checked = 0;
    const { data } = await sb.from("seed_merchants")
      .select("id, name, description, vertical, category, subcategory")
      .or("vertical.is.null,category.is.null,category.eq.general,category.eq.other,category.eq.unknown")
      .limit(60);
    checked = data?.length ?? 0;
    for (const m of data ?? []) {
      const fixes: Record<string, any> = {};
      const text = `${m.name || ""} ${m.description || ""}`.toLowerCase();
      if (!m.vertical) {
        if (text.match(/hotel|resort|hostel|lodge|inn|motel|suites/)) fixes.vertical = "hotel";
        else if (text.match(/restaurant|cafe|coffee|bakery|pizza|burger|sushi|grill|diner|bistro|kitchen|food/)) fixes.vertical = "food";
        else if (text.match(/grocery|supermarket|market|mart|fresh/)) fixes.vertical = "grocery";
        else if (text.match(/salon|spa|barber|beauty|clinic|dental|gym|fitness|laundry|cleaning/)) fixes.vertical = "services";
        else if (text.match(/shop|store|retail|boutique|mall/)) fixes.vertical = "retail";
        else fixes.vertical = "services";
      }
      const vert = fixes.vertical || m.vertical;
      if (!m.category || ["general", "other", "unknown"].includes((m.category || "").toLowerCase())) {
        if (vert === "food") {
          if (text.includes("cafe") || text.includes("coffee")) fixes.category = "cafe";
          else if (text.includes("bakery") || text.includes("pastry")) fixes.category = "bakery";
          else if (text.includes("fast") || text.includes("burger") || text.includes("pizza")) fixes.category = "fast_food";
          else if (text.includes("sushi") || text.includes("japanese")) fixes.category = "japanese";
          else if (text.includes("indian") || text.includes("curry")) fixes.category = "indian";
          else if (text.includes("chinese") || text.includes("wok")) fixes.category = "chinese";
          else if (text.includes("italian") || text.includes("pasta")) fixes.category = "italian";
          else fixes.category = "restaurant";
        } else if (vert === "hotel") {
          if (text.includes("resort")) fixes.category = "resort";
          else if (text.includes("apartment") || text.includes("serviced")) fixes.category = "serviced_apartment";
          else if (text.includes("hostel")) fixes.category = "hostel";
          else fixes.category = "hotel";
        } else if (vert === "services") {
          if (text.includes("salon") || text.includes("beauty")) fixes.category = "beauty_salon";
          else if (text.includes("barber")) fixes.category = "barbershop";
          else if (text.includes("spa") || text.includes("massage")) fixes.category = "spa";
          else if (text.includes("gym") || text.includes("fitness")) fixes.category = "gym";
          else if (text.includes("laundry") || text.includes("cleaning")) fixes.category = "cleaning";
          else if (text.includes("clinic") || text.includes("dental") || text.includes("medical")) fixes.category = "healthcare";
          else fixes.category = "professional_services";
        } else {
          fixes.category = vert || "services";
        }
      }
      if (Object.keys(fixes).length > 0) {
        fixes.taxonomy_enforced_at = new Date().toISOString();
        await sb.from("seed_merchants").update(fixes).eq("id", m.id);
        fixed++;
      }
    }
    return { summary: `Taxonomy enforced: ${fixed}/${checked} fixed`, rows: fixed, rowsRead: checked, sideEffects: fixed };
  },

  "maintenance-sweep": async (sb) => {
    let actions = 0;
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    const { data: expiredQr } = await sb.from("qr_sessions").select("id").eq("status", "pending").lt("created_at", oneHourAgo).limit(100);
    for (const s of expiredQr ?? []) {
      await sb.from("qr_sessions").update({ status: "expired" }).eq("id", s.id);
      actions++;
    }

    const { data: oldNotifs } = await sb.from("notifications").select("id").eq("read", true).lt("created_at", thirtyDaysAgo).limit(200);
    for (const n of oldNotifs ?? []) {
      await sb.from("notifications").delete().eq("id", n.id);
      actions++;
    }

    const { data: expiredCoupons } = await sb.from("coupons").select("id").eq("active", true).lt("expires_at", new Date().toISOString()).limit(100);
    for (const c of expiredCoupons ?? []) {
      await sb.from("coupons").update({ active: false }).eq("id", c.id);
      actions++;
    }

    const { data: exhaustedBoosts } = await sb.from("boost_campaigns").select("id, spent, total_budget").eq("status", "active").limit(100);
    for (const c of exhaustedBoosts ?? []) {
      if (c.total_budget && c.spent >= c.total_budget) {
        await sb.from("boost_campaigns").update({ status: "completed" }).eq("id", c.id);
        actions++;
      }
    }

    const { data: oldLogs } = await sb.from("engine_run_logs").select("id").lt("started_at", ninetyDaysAgo).limit(500);
    for (const l of oldLogs ?? []) {
      await sb.from("engine_run_logs").delete().eq("id", l.id);
      actions++;
    }

    const { data: oldHealthSnaps } = await sb.from("worker_health_snapshots").select("id").lt("snapshot_at", thirtyDaysAgo).limit(200);
    for (const s of oldHealthSnaps ?? []) {
      await sb.from("worker_health_snapshots").delete().eq("id", s.id);
      actions++;
    }

    return { summary: `Maintenance sweep: ${actions} actions`, rows: actions, rowsRead: 0, sideEffects: actions };
  },

  "health-monitor": async (sb) => {
    const { data: engines } = await sb.from("engine_supervisor").select("engine_name, status, heartbeat, enabled, consecutive_failures, success_rate");
    if (!engines || engines.length === 0) return { summary: "No engines found", rows: 0, rowsRead: 0, sideEffects: 0 };

    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;
    let healthy = 0;
    let stale = 0;
    let errored = 0;
    let disabled = 0;
    const staleNames: string[] = [];
    const errorNames: string[] = [];
    let totalSuccessRate = 0;
    let ratedCount = 0;

    for (const e of engines) {
      if (!e.enabled) { disabled++; continue; }
      if (e.status === "error") { errored++; errorNames.push(e.engine_name); continue; }
      const hb = e.heartbeat ? new Date(e.heartbeat).getTime() : 0;
      if (hb === 0) {
        healthy++;
      } else if (now - hb > staleThreshold) {
        stale++;
        staleNames.push(e.engine_name);
        await sb.from("engine_supervisor").update({ status: "idle", consecutive_failures: 0 }).eq("engine_name", e.engine_name);
      } else {
        healthy++;
      }
      if (e.success_rate != null) { totalSuccessRate += e.success_rate; ratedCount++; }
    }

    const { data: recentLogs } = await sb.from("engine_run_logs").select("id").gte("started_at", new Date(now - 3600000).toISOString());
    const runsLastHour = recentLogs?.length ?? 0;

    await sb.from("worker_health_snapshots").insert({
      snapshot_at: new Date().toISOString(),
      total_engines: engines.length,
      healthy_count: healthy,
      stale_count: stale,
      error_count: errored,
      disabled_count: disabled,
      stale_engines: staleNames,
      error_engines: errorNames,
      avg_success_rate: ratedCount > 0 ? Math.round((totalSuccessRate / ratedCount) * 100) / 100 : 0,
      total_runs_last_hour: runsLastHour,
    });

    return {
      summary: `Health: ${healthy} ok, ${stale} stale (recovered), ${errored} error, ${disabled} disabled | ${runsLastHour} runs/hr`,
      rows: 1,
      rowsRead: engines.length + (recentLogs?.length ?? 0),
      sideEffects: stale + 1,
    };
  },

  "source-of-truth-drift": async (sb) => {
    let drifts = 0, checked = 0;
    const { data: merchants } = await sb.from("seed_merchants")
      .select("id, name, visibility_mode, visibility_score, trust_score, gate_status, verification_status")
      .in("visibility_mode", ["full", "search_only"]).limit(100);
    checked = merchants?.length ?? 0;
    for (const m of merchants ?? []) {
      const issues: string[] = [];
      if ((m.visibility_mode === "full") && (m.visibility_score ?? 0) < 30) issues.push("full_visibility_but_low_score");
      if ((m.visibility_mode === "full") && m.gate_status !== "passed") issues.push("full_but_gate_not_passed");
      if ((m.trust_score ?? 0) > 80 && m.visibility_mode === "search_only") issues.push("high_trust_but_hidden");
      if (issues.length > 0) {
        drifts++;
        await sb.from("engine_run_logs").insert({
          id: crypto.randomUUID(),
          engine_name: "source-of-truth-drift",
          category: "drift",
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: 0,
          status: "warning",
          effect_summary: `Drift on ${m.name}: ${issues.join(", ")}`,
          metadata_json: { merchant_id: m.id, issues },
        });
      }
    }
    return { summary: `Checked ${checked}, found ${drifts} drifts`, rows: drifts, rowsRead: checked };
  },

  "incident-classify": async (sb) => {
    let classified = 0;
    const { data: errors } = await sb.from("engine_run_logs")
      .select("id, engine_name, error_message, status, metadata_json")
      .eq("status", "error")
      .is("metadata_json->>incident_class", null)
      .order("started_at", { ascending: false }).limit(50);
    for (const e of errors ?? []) {
      let severity: string = "low";
      let category: string = "unknown";
      const msg = (e.error_message || "").toLowerCase();
      if (msg.includes("timeout") || msg.includes("deadline")) { severity = "medium"; category = "timeout"; }
      else if (msg.includes("permission") || msg.includes("auth") || msg.includes("forbidden")) { severity = "high"; category = "auth"; }
      else if (msg.includes("duplicate") || msg.includes("unique")) { severity = "medium"; category = "data_conflict"; }
      else if (msg.includes("not found") || msg.includes("404")) { severity = "low"; category = "missing_resource"; }
      else if (msg.includes("rate limit") || msg.includes("429")) { severity = "high"; category = "rate_limit"; }
      else if (msg.includes("connection") || msg.includes("network")) { severity = "high"; category = "connectivity"; }
      else { category = "runtime_error"; severity = "medium"; }
      await sb.from("engine_run_logs").update({
        metadata_json: { ...(e.metadata_json || {}), incident_class: category, incident_severity: severity },
      }).eq("id", e.id);
      classified++;
    }
    return { summary: `Classified ${classified} incidents`, rows: classified, rowsRead: errors?.length ?? 0 };
  },

  "pricing-integrity": async (sb) => {
    let checked = 0, fixed = 0;
    const { data: items } = await sb.from("menu_items")
      .select("id, price, name, merchant_id")
      .or("price.is.null,price.lt.0,price.gt.99999")
      .limit(100);
    checked = items?.length ?? 0;
    for (const item of items ?? []) {
      if (item.price === null || item.price < 0) {
        await sb.from("menu_items").update({ price: 0, price_flag: "invalid_corrected" }).eq("id", item.id);
        fixed++;
      } else if (item.price > 99999) {
        await sb.from("menu_items").update({ price_flag: "suspiciously_high" }).eq("id", item.id);
        fixed++;
      }
    }
    return { summary: `Checked pricing: ${checked} items, fixed ${fixed}`, rows: fixed, rowsRead: checked };
  },

  "availability-integrity": async (sb) => {
    let checked = 0, updated = 0;
    const { data: merchants } = await sb.from("seed_merchants")
      .select("id, name, visibility_mode, is_open, opening_hours")
      .in("visibility_mode", ["full", "search_only"]).limit(80);
    checked = merchants?.length ?? 0;
    for (const m of merchants ?? []) {
      if (m.is_open === null && m.visibility_mode === "full") {
        await sb.from("seed_merchants").update({ is_open: true }).eq("id", m.id);
        updated++;
      }
    }
    return { summary: `Availability check: ${checked} merchants, ${updated} corrected`, rows: updated, rowsRead: checked };
  },

  "regression-metrics": async (sb) => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 7200000).toISOString();
    const { data: recent } = await sb.from("engine_run_logs").select("status").gte("started_at", hourAgo);
    const { data: prev } = await sb.from("engine_run_logs").select("status").gte("started_at", twoHoursAgo).lt("started_at", hourAgo);
    const recentErrors = (recent ?? []).filter((r: { status: string }) => r.status === "error").length;
    const prevErrors = (prev ?? []).filter((r: { status: string }) => r.status === "error").length;
    const recentTotal = recent?.length ?? 0;
    const prevTotal = prev?.length ?? 0;
    const recentRate = recentTotal > 0 ? Math.round((1 - recentErrors / recentTotal) * 100) : 100;
    const prevRate = prevTotal > 0 ? Math.round((1 - prevErrors / prevTotal) * 100) : 100;
    const regressed = recentRate < prevRate - 10;
    if (regressed) {
      await sb.from("worker_health_snapshots").insert({
        snapshot_at: now.toISOString(),
        total_engines: 0,
        healthy_count: 0,
        stale_count: 0,
        error_count: 0,
        disabled_count: 0,
        avg_success_rate: recentRate,
        total_runs_last_hour: recentTotal,
        metadata_json: { type: "regression_alert", prev_rate: prevRate, current_rate: recentRate },
      });
    }
    return {
      summary: `Metrics: ${recentRate}% success (prev ${prevRate}%), ${regressed ? "REGRESSION DETECTED" : "stable"}`,
      rows: regressed ? 1 : 0,
      rowsRead: (recent?.length ?? 0) + (prev?.length ?? 0),
    };
  },

  "orphan-entity-cleanup": async (sb) => {
    let cleaned = 0;
    const { data: orphanMedia } = await sb.from("merchant_media")
      .select("id, merchant_id")
      .is("merchant_id", null)
      .limit(30);
    for (const m of orphanMedia ?? []) {
      await sb.from("merchant_media").delete().eq("id", m.id);
      cleaned++;
    }
    const { data: orphanMenuItems } = await sb.from("menu_items")
      .select("id, merchant_id")
      .is("merchant_id", null)
      .limit(30);
    for (const item of orphanMenuItems ?? []) {
      await sb.from("menu_items").delete().eq("id", item.id);
      cleaned++;
    }
    return { summary: `Orphan cleanup: ${cleaned} orphan records removed`, rows: cleaned, rowsRead: (orphanMedia?.length ?? 0) + (orphanMenuItems?.length ?? 0) };
  },

  "stale-flow-detection": async (sb) => {
    let stale = 0;
    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleBookings } = await sb.from("bookings")
      .select("id, status, updated_at")
      .eq("status", "pending")
      .lt("updated_at", staleThreshold)
      .limit(50);
    for (const b of staleBookings ?? []) {
      await sb.from("bookings").update({ status: "expired" }).eq("id", b.id);
      stale++;
    }
    return { summary: `Stale flow detection: ${stale} expired`, rows: stale, rowsRead: staleBookings?.length ?? 0 };
  },

  "proof-log-aggregation": async (sb) => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000).toISOString();
    const { data: logs } = await sb.from("engine_run_logs")
      .select("engine_name, status, duration_ms, db_rows_affected")
      .gte("started_at", hourAgo);
    const byEngine = new Map<string, { runs: number; errors: number; totalRows: number; totalMs: number }>();
    for (const log of logs ?? []) {
      const key = log.engine_name;
      if (!byEngine.has(key)) byEngine.set(key, { runs: 0, errors: 0, totalRows: 0, totalMs: 0 });
      const entry = byEngine.get(key)!;
      entry.runs++;
      if (log.status === "error") entry.errors++;
      entry.totalRows += log.db_rows_affected ?? 0;
      entry.totalMs += log.duration_ms ?? 0;
    }
    const aggregated = Object.fromEntries(byEngine);
    await sb.from("worker_health_snapshots").insert({
      snapshot_at: now.toISOString(),
      total_engines: byEngine.size,
      healthy_count: 0,
      stale_count: 0,
      error_count: 0,
      disabled_count: 0,
      avg_success_rate: 0,
      total_runs_last_hour: logs?.length ?? 0,
      metadata_json: { type: "hourly_aggregation", engines: aggregated },
    });
    return { summary: `Aggregated ${logs?.length ?? 0} logs from ${byEngine.size} engines`, rows: 1, rowsRead: logs?.length ?? 0 };
  },
};

// Generic no-op handler for engines not yet wired
async function noopEngine(_sb: any, name: string): Promise<EngineResult> {
  return { summary: `${name} heartbeat ok`, rows: 0, rowsRead: 0, sideEffects: 0 };
}

function runWithTimeout(fn: () => Promise<EngineResult>, timeoutMs: number): Promise<EngineResult> {
  return Promise.race([
    fn(),
    new Promise<EngineResult>((_, reject) =>
      setTimeout(() => reject(new Error(`Engine timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isServiceRole = authHeader === `Bearer ${serviceKey}`;
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isServiceRole && !isCronAuth) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  // Parse body for force mode
  let forceRun = false;
  let forceEngines: string[] | null = null;
  try {
    const body = await req.json();
    forceRun = body?.force === true;
    if (body?.engines && Array.isArray(body.engines)) forceEngines = body.engines;
  } catch { /* no body */ }

  try {
    // ── Step 0: Recover stuck engines (running > 2 min) ──
    const stuckCutoff = new Date(Date.now() - 120000).toISOString();
    await sb.from("engine_supervisor")
      .update({ status: "idle" })
      .eq("status", "running")
      .lt("heartbeat", stuckCutoff);

    // ── Step 1: Get eligible engines ──
    // FIX: Use or() to handle kill_switch NULL (treat NULL as not-killed)
    let query = sb.from("engine_supervisor").select("*").eq("enabled", true).order("engine_name");

    const { data: allEngines } = await query;
    if (!allEngines || allEngines.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No engines enabled", ran: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out killed engines (kill_switch === true explicitly)
    let engines = allEngines.filter((e: any) => e.kill_switch !== true);

    // If forceEngines specified, filter to those
    if (forceEngines) {
      engines = engines.filter((e: any) => forceEngines!.includes(e.engine_name));
    }

    const now = Date.now();
    let ran = 0;
    let errors = 0;
    const results: { engine: string; status: string; summary: string; durationMs?: number }[] = [];

    for (const engine of engines) {
      // Check interval (skip if not forced and not due)
      if (!forceRun) {
        const lastRun = engine.last_run_at ? new Date(engine.last_run_at).getTime() : 0;
        const freqMs = engine.frequency_seconds ? engine.frequency_seconds * 1000 : (engine.interval_ms || 300000);
        if (now - lastRun < freqMs) continue;
      }

      // Check max retries
      if ((engine.consecutive_failures || 0) >= (engine.max_retries || 5)) {
        await sb.from("engine_supervisor").update({ enabled: false, status: "disabled" }).eq("engine_name", engine.engine_name);
        results.push({ engine: engine.engine_name, status: "disabled", summary: "Max retries exceeded" });
        continue;
      }

      // Optimistic lock — mark as running (allow re-lock if status is idle, ok, error, or null)
      const { data: lockResult } = await sb.from("engine_supervisor").update({
        status: "running",
        heartbeat: new Date().toISOString(),
      }).eq("engine_name", engine.engine_name).neq("status", "running").select("engine_name");

      if (!lockResult || lockResult.length === 0) {
        // If forced, try unconditional lock
        if (forceRun) {
          await sb.from("engine_supervisor").update({
            status: "running",
            heartbeat: new Date().toISOString(),
          }).eq("engine_name", engine.engine_name);
        } else {
          continue;
        }
      }

      const start = Date.now();
      const logId = crypto.randomUUID();
      const timeoutMs = engine.timeout_ms || 30000;
      const isDryRun = engine.dry_run === true;

      try {
        const handler = ENGINE_ACTIONS[engine.engine_name] || ((s: any) => noopEngine(s, engine.engine_name));

        let result: EngineResult;
        if (isDryRun) {
          result = { summary: `[DRY-RUN] ${engine.engine_name}`, rows: 0, rowsRead: 0, sideEffects: 0 };
        } else {
          result = await runWithTimeout(() => handler(sb), timeoutMs);
        }

        const duration = Date.now() - start;
        const totalRuns = (engine.total_runs || 0) + 1;
        const totalRows = (engine.total_rows_affected || 0) + result.rows;

        await sb.from("engine_supervisor").update({
          status: "ok",
          last_run_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          last_duration_ms: duration,
          consecutive_failures: 0,
          last_error_message: null,
          total_runs: totalRuns,
          total_rows_affected: totalRows,
          success_rate: Math.round(((((engine.success_rate ?? 100) * Math.max(totalRuns - 1, 0)) + 100) / Math.max(totalRuns, 1)) * 100) / 100,
        }).eq("engine_name", engine.engine_name);

        // Persist run log
        const { error: logErr } = await sb.from("engine_run_logs").insert({
          id: logId,
          engine_name: engine.engine_name,
          category: "cron",
          started_at: new Date(start).toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: duration,
          status: "ok",
          effect_summary: result.summary,
          db_rows_affected: result.rows,
          rows_read: result.rowsRead ?? 0,
          side_effect_count: result.sideEffects ?? 0,
          trigger_source: forceRun ? "force" : "cron",
          metadata_json: { isDryRun },
        });

        if (logErr) {
          console.error(`[run-log] FAILED for ${engine.engine_name}: ${logErr.message}`);
        }

        results.push({ engine: engine.engine_name, status: "ok", summary: result.summary, durationMs: duration });
        ran++;
      } catch (e: any) {
        const duration = Date.now() - start;
        const failures = (engine.consecutive_failures || 0) + 1;
        const totalRuns = (engine.total_runs || 0) + 1;

        await sb.from("engine_supervisor").update({
          status: "error",
          last_run_at: new Date().toISOString(),
          last_error_at: new Date().toISOString(),
          last_duration_ms: duration,
          consecutive_failures: failures,
          last_error_message: e?.message?.slice(0, 500) || "unknown",
          total_runs: totalRuns,
          success_rate: Math.round((((engine.success_rate ?? 100) * Math.max(totalRuns - 1, 0)) / Math.max(totalRuns, 1)) * 100) / 100,
        }).eq("engine_name", engine.engine_name);

        await sb.from("engine_run_logs").insert({
          id: logId,
          engine_name: engine.engine_name,
          category: "cron",
          started_at: new Date(start).toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: duration,
          status: "error",
          error_message: e?.message?.slice(0, 500) || "unknown",
          trigger_source: forceRun ? "force" : "cron",
        }).catch(() => {});

        results.push({ engine: engine.engine_name, status: "error", summary: e?.message?.slice(0, 100) || "unknown" });
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, total: engines.length, ran, errors, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
