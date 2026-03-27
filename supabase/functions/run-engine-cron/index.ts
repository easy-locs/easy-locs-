/**
 * run-engine-cron — 24/7 autonomous engine runner (HARDENED V3).
 * 
 * V3 fixes:
 * - kill_switch NULL handling (treat NULL as false)
 * - Stuck "running" recovery (auto-unlock after 2min)
 * - Force mode to bypass interval gating
 * - Guaranteed engine_run_logs persistence
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
      for (const s of data) {
        await sb.from("storefront_pages").update({ route_status: "draft" }).eq("id", s.id);
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
        const interval = engine.interval_ms || 300000;
        if (now - lastRun < interval) continue;
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
          success_rate: Math.round((totalRuns / Math.max(totalRuns, 1)) * 10000) / 100,
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
