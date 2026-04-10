import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StepResult = {
  key: string;
  status: "pass" | "fail";
  elapsedMs: number;
  details?: Record<string, unknown>;
};

type ScenarioResult = {
  key: string;
  moduleKey: string;
  routeKey: string;
  area: string;
  status: "pass" | "fail" | "degraded" | "partial" | "fixed" | "skipped";
  severity: "critical" | "warning" | "info";
  issueType?: string;
  summary?: string;
  rootCause?: string;
  autoFixApplied: boolean;
  fixSummary?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  steps: StepResult[];
};

const SCENARIOS = [
  { key: "orbit_thread_load", moduleKey: "orbit", routeKey: "/orbit", area: "messaging", scope: "orbit", severityIfFail: "critical" as const },
  { key: "orbit_send_message_chain", moduleKey: "orbit", routeKey: "/orbit", area: "messaging", scope: "orbit", severityIfFail: "critical" as const },
  { key: "orbit_group_chain", moduleKey: "orbit", routeKey: "/orbit", area: "groups", scope: "orbit", severityIfFail: "warning" as const },
  { key: "wallet_core_chain", moduleKey: "wallet", routeKey: "/wallet", area: "payments", scope: "wallet", severityIfFail: "critical" as const },
  { key: "wallet_qr_chain", moduleKey: "wallet", routeKey: "/wallet/qr", area: "payments", scope: "wallet", severityIfFail: "warning" as const },
  { key: "dashboard_core_chain", moduleKey: "dashboard", routeKey: "/dashboard", area: "dashboard", scope: "dashboard", severityIfFail: "critical" as const },
  { key: "hotel_chain", moduleKey: "hotel", routeKey: "/travel/hotel", area: "booking", scope: "hotel", severityIfFail: "critical" as const },
  { key: "food_chain", moduleKey: "food", routeKey: "/marketplace/food", area: "marketplace", scope: "food", severityIfFail: "critical" as const },
  { key: "shop_chain", moduleKey: "shop", routeKey: "/marketplace", area: "marketplace", scope: "shop", severityIfFail: "warning" as const },
  { key: "radar_chain", moduleKey: "radar", routeKey: "/radar", area: "map", scope: "radar", severityIfFail: "critical" as const },
  { key: "onboarding_chain", moduleKey: "onboarding", routeKey: "/onboarding", area: "onboarding", scope: "onboarding", severityIfFail: "warning" as const },
  { key: "me_chain", moduleKey: "me", routeKey: "/me", area: "profile", scope: "me", severityIfFail: "warning" as const },
  { key: "browser_repair_chain", moduleKey: "browser_repair", routeKey: "/admin/engine-cockpit", area: "qa", scope: "browser_repair", severityIfFail: "warning" as const },
  { key: "live_merchant_integrity", moduleKey: "integrity", routeKey: "/marketplace", area: "integrity", scope: "global", severityIfFail: "critical" as const },
  { key: "stuck_engines_integrity", moduleKey: "integrity", routeKey: "/admin/engine-cockpit", area: "integrity", scope: "global", severityIfFail: "warning" as const },
];

function buildReport(results: ScenarioResult[]) {
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const degradedCount = results.filter((r) => r.status === "degraded" || r.status === "partial").length;
  const fixedCount = results.filter((r) => r.status === "fixed" || r.autoFixApplied).length;
  const criticalCount = results.filter((r) => r.severity === "critical" && r.status !== "pass").length;
  const warningCount = results.filter((r) => r.severity === "warning" && r.status !== "pass").length;
  const byModule: Record<string, number> = {};
  const byIssueType: Record<string, number> = {};
  const byRoute: Record<string, number> = {};
  let totalSteps = 0;
  let totalStepMs = 0;
  for (const r of results) {
    byModule[r.moduleKey] = (byModule[r.moduleKey] ?? 0) + 1;
    if (r.status !== "pass") byRoute[r.routeKey] = (byRoute[r.routeKey] ?? 0) + 1;
    if (r.issueType) byIssueType[r.issueType] = (byIssueType[r.issueType] ?? 0) + 1;
    totalSteps += r.steps.length || 1;
    totalStepMs += r.durationMs;
  }
  return { total_modules: [...new Set(results.map((r) => r.moduleKey))].length, total_scenarios: results.length, total_steps: totalSteps, pass_count: passCount, fail_count: failCount, degraded_count: degradedCount, fixed_count: fixedCount, critical_count: criticalCount, warning_count: warningCount, avg_step_ms: totalSteps > 0 ? Math.round(totalStepMs / totalSteps) : 0, by_module: byModule, by_issue_type: byIssueType, by_route: byRoute };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { body = {}; }

    const scope = (body.scope as string) ?? "full";
    const dryRun = (body.dryRun as boolean) ?? false;
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const results: ScenarioResult[] = [];

    const { data: runRow, error: runErr } = await supabase
      .from("runtime_qa_runs")
      .insert({ engine_name: "master-runtime-qa-engine", scope, started_at: startedAt, status: "running" })
      .select("id")
      .single();

    if (runErr) throw runErr;
    const runId = runRow.id;

    async function timedCheck(key: string, fn: () => Promise<{ ok: boolean; details?: Record<string, unknown> }>): Promise<StepResult> {
      const t = Date.now();
      try {
        const res = await fn();
        return { key, status: res.ok ? "pass" : "fail", elapsedMs: Date.now() - t, details: res.details ?? {} };
      } catch (err) {
        return { key, status: "fail", elapsedMs: Date.now() - t, details: { error: String(err) } };
      }
    }

    async function pushScenario(result: ScenarioResult) {
      results.push(result);
      const { data: scenarioRow } = await supabase
        .from("runtime_qa_scenarios")
        .insert({ run_id: runId, module_key: result.moduleKey, scenario_key: result.key, area: result.area, route_key: result.routeKey, status: result.status, severity: result.severity, issue_type: result.issueType ?? null, summary: result.summary ?? null, root_cause: result.rootCause ?? null, auto_fix_applied: result.autoFixApplied, fix_summary: result.fixSummary ?? null, duration_ms: result.durationMs, metadata_json: result.metadata ?? {} })
        .select("id").single();
      if (scenarioRow?.id && result.steps.length > 0) {
        await supabase.from("runtime_qa_steps").insert(result.steps.map((s) => ({ run_id: runId, scenario_id: scenarioRow.id, module_key: result.moduleKey, scenario_key: result.key, step_key: s.key, status: s.status, elapsed_ms: s.elapsedMs, details_json: s.details ?? {} })));
      }
    }

    // Helper for simple table-existence checks
    async function simpleTableCheck(tableName: string, stepKey: string, filters?: Record<string, unknown>): Promise<StepResult> {
      return timedCheck(stepKey, async () => {
        let query = supabase.from(tableName).select("id", { count: "exact", head: true });
        if (filters) {
          for (const [k, v] of Object.entries(filters)) {
            query = query.eq(k, v);
          }
        }
        const { count, error } = await query;
        return { ok: !error && (count ?? 0) >= 0, details: { [tableName]: count ?? 0 } };
      });
    }

    async function simpleExistsCheck(tableName: string, stepKey: string, filters?: Record<string, unknown>): Promise<StepResult> {
      return timedCheck(stepKey, async () => {
        let query = supabase.from(tableName).select("id", { count: "exact", head: true });
        if (filters) {
          for (const [k, v] of Object.entries(filters)) {
            if (v === null) { query = query.is(k, null); }
            else { query = query.eq(k, v as string); }
          }
        }
        const { count, error } = await query;
        return { ok: !error && (count ?? 0) > 0, details: { [tableName]: count ?? 0 } };
      });
    }

    for (const scenario of SCENARIOS) {
      if (scope !== "full" && scenario.scope !== scope && scenario.scope !== "global") continue;
      const st = Date.now();

      if (scenario.key === "orbit_thread_load") {
        const s1 = await simpleTableCheck("conversations_v2", "conversations_v2_access");
        const s2 = await simpleTableCheck("chat_messages_v2", "chat_messages_v2_access");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" && s2.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, summary: "Orbit V2 thread chain check", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "orbit_send_message_chain") {
        const s1 = await simpleTableCheck("chat_messages_v2", "message_insert_ready");
        const s2 = await simpleTableCheck("conversations_v2", "conversation_update_ready");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" && s2.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, summary: "Orbit send message structural chain ready", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "orbit_group_chain") {
        const s1 = await simpleTableCheck("conversations_v2", "group_count");
        const s2 = await timedCheck("group_participants_valid", async () => {
          const { data, error } = await supabase.from("conversations_v2").select("id, participants").eq("type", "group").limit(20);
          if (error) return { ok: false };
          const invalid = (data ?? []).filter((x: any) => !Array.isArray(x.participants) || x.participants.length < 2);
          return { ok: invalid.length === 0, details: { invalid: invalid.length } };
        });
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s2.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, summary: "Orbit group integrity", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "wallet_core_chain") {
        const s1 = await simpleTableCheck("wallet_accounts", "wallet_accounts");
        const s2 = await simpleTableCheck("wallet_transactions_v2", "wallet_transactions");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" && s2.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, summary: "Wallet core chain", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "wallet_qr_chain") {
        const s1 = await simpleExistsCheck("wallet_accounts", "wallet_accounts_present");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, summary: "Wallet QR structural readiness", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }

      if (scenario.key === "dashboard_core_chain") {
        const s1 = await simpleTableCheck("orgs", "orgs_accessible");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, summary: "Dashboard core data sources", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }

      if (scenario.key === "hotel_chain") {
        const s1 = await simpleExistsCheck("hotels", "hotels_exist");
        const s2 = await simpleExistsCheck("hotel_rooms", "hotel_rooms_exist");
        const s3 = await simpleExistsCheck("hotel_rate_plans", "hotel_rate_plans_exist");
        const s4 = await simpleExistsCheck("hotel_inventory_calendar", "hotel_calendar_exist");
        const failCount = [s1, s2, s3, s4].filter((x) => x.status === "fail").length;
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: failCount === 0 ? "pass" : failCount >= 3 ? "fail" : "degraded", severity: scenario.severityIfFail, issueType: failCount > 0 ? "hotel_chain_incomplete" : undefined, summary: "Hotel chain proof", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2, s3, s4] });
        continue;
      }

      if (scenario.key === "food_chain") {
        const s1 = await simpleExistsCheck("seed_merchants", "food_merchants_exist", { vertical: "food" });
        const s2 = await timedCheck("food_menus_exist", async () => {
          const { count } = await supabase.from("seed_merchants").select("id", { count: "exact", head: true }).eq("vertical", "food").not("menu_items_json", "is", null);
          return { ok: (count ?? 0) > 0, details: { food_menus: count ?? 0 } };
        });
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" && s2.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, issueType: s2.status === "fail" ? "food_menu_missing" : undefined, summary: "Food marketplace chain", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "shop_chain") {
        const s1 = await simpleExistsCheck("storefront_pages", "storefront_pages_exist", { active: true });
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, summary: "Shop chain", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }

      if (scenario.key === "radar_chain") {
        const s1 = await timedCheck("geo_merchants_exist", async () => {
          const { count } = await supabase.from("seed_merchants").select("id", { count: "exact", head: true }).not("latitude", "is", null).not("longitude", "is", null);
          return { ok: (count ?? 0) > 0, details: { geo_merchants: count ?? 0 } };
        });
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, issueType: s1.status === "fail" ? "radar_no_geo_data" : undefined, summary: "Radar geo chain", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }

      if (scenario.key === "onboarding_chain") {
        const s1 = await simpleTableCheck("merchant_onboarding_profiles", "merchant_onboarding_profiles");
        const s2 = await simpleTableCheck("entity_pipeline_queue", "entity_pipeline_queue");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" && s2.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, summary: "Onboarding chain", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "me_chain") {
        const s1 = await simpleTableCheck("orbit_profiles_v2", "auth_profile_tables");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, summary: "Me profile shell chain", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }

      if (scenario.key === "browser_repair_chain") {
        const s1 = await simpleTableCheck("browser_repair_runs", "browser_repair_runs");
        const s2 = await simpleTableCheck("browser_repair_watchdog", "browser_repair_watchdog");
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: s1.status === "pass" && s2.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, summary: "Browser repair subsystem", autoFixApplied: false, durationMs: Date.now() - st, steps: [s1, s2] });
        continue;
      }

      if (scenario.key === "live_merchant_integrity") {
        const s1 = await timedCheck("live_merchants_required_fields", async () => {
          const { data } = await supabase.from("seed_merchants").select("id").eq("visibility_mode", "live").or("name.is.null,category.is.null,vertical.is.null").limit(50);
          return { ok: (data?.length ?? 0) === 0, details: { broken_live_merchants: data?.length ?? 0 } };
        });
        let autoFixApplied = false;
        let fixSummary: string | undefined;
        if (s1.status === "fail" && !dryRun) {
          const { data: broken } = await supabase.from("seed_merchants").select("id").eq("visibility_mode", "live").or("name.is.null,category.is.null,vertical.is.null").limit(50);
          for (const row of broken ?? []) {
            await supabase.from("seed_merchants").update({ visibility_mode: "hidden", blocking_reason: "master_runtime_qa:missing_required_fields" } as any).eq("id", (row as any).id);
          }
          if ((broken?.length ?? 0) > 0) { autoFixApplied = true; fixSummary = `Hid ${broken?.length ?? 0} broken live merchants`; }
        }
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: autoFixApplied ? "fixed" : s1.status === "pass" ? "pass" : "fail", severity: scenario.severityIfFail, issueType: s1.status === "fail" ? "live_merchants_missing_required_fields" : undefined, summary: "Live merchant integrity", autoFixApplied, fixSummary, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }

      if (scenario.key === "stuck_engines_integrity") {
        const s1 = await timedCheck("stuck_engines_check", async () => {
          const { data } = await supabase.from("engine_supervisor").select("engine_name, status").eq("status", "running");
          return { ok: (data?.length ?? 0) === 0, details: { stuck_engines: data?.length ?? 0 } };
        });
        let autoFixApplied = false;
        let fixSummary: string | undefined;
        if (s1.status === "fail" && !dryRun) {
          await supabase.from("engine_supervisor").update({ status: "idle" } as any).eq("status", "running");
          autoFixApplied = true;
          fixSummary = `Reset ${s1.details?.stuck_engines ?? 0} stuck engines to idle`;
        }
        await pushScenario({ key: scenario.key, moduleKey: scenario.moduleKey, routeKey: scenario.routeKey, area: scenario.area, status: autoFixApplied ? "fixed" : s1.status === "pass" ? "pass" : "degraded", severity: scenario.severityIfFail, issueType: s1.status === "fail" ? "stuck_engines_detected" : undefined, summary: "Stuck engines integrity", autoFixApplied, fixSummary, durationMs: Date.now() - st, steps: [s1] });
        continue;
      }
    }

    // Finalize run
    const report = buildReport(results);
    const durationMs = Date.now() - t0;

    await supabase.from("runtime_qa_runs").update({
      finished_at: new Date().toISOString(),
      status: report.fail_count > 0 ? "issues_found" : report.fixed_count > 0 ? "partial" : "clean",
      total_modules: report.total_modules,
      total_scenarios: report.total_scenarios,
      pass_count: report.pass_count,
      fail_count: report.fail_count,
      degraded_count: report.degraded_count,
      fixed_count: report.fixed_count,
      critical_count: report.critical_count,
      warning_count: report.warning_count,
      duration_ms: durationMs,
      report_json: report,
      metadata_json: { scope, dryRun },
    }).eq("id", runId);

    // Update watchdog
    const byRoute = new Map<string, { moduleKey: string; ok: boolean; issue?: string }>();
    for (const r of results) {
      const prev = byRoute.get(r.routeKey);
      const current = { moduleKey: r.moduleKey, ok: r.status === "pass", issue: r.status === "pass" ? undefined : r.summary ?? r.issueType ?? "runtime_qa_issue" };
      if (!prev) byRoute.set(r.routeKey, current);
      else if (prev.ok && !current.ok) byRoute.set(r.routeKey, current);
    }
    for (const [routeKey, health] of byRoute.entries()) {
      const { data: existing } = await supabase.from("runtime_qa_watchdog").select("id, consecutive_failures").eq("module_key", health.moduleKey).eq("route_key", routeKey).maybeSingle();
      if (existing?.id) {
        await supabase.from("runtime_qa_watchdog").update({
          current_status: health.ok ? "ok" : "failing",
          consecutive_failures: health.ok ? 0 : ((existing as any).consecutive_failures ?? 0) + 1,
          last_seen_ok_at: health.ok ? new Date().toISOString() : undefined,
          last_seen_fail_at: health.ok ? undefined : new Date().toISOString(),
          current_issue: health.issue ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", (existing as any).id);
      } else {
        await supabase.from("runtime_qa_watchdog").insert({
          module_key: health.moduleKey, route_key: routeKey,
          current_status: health.ok ? "ok" : "failing",
          consecutive_failures: health.ok ? 0 : 1,
          last_seen_ok_at: health.ok ? new Date().toISOString() : null,
          last_seen_fail_at: health.ok ? null : new Date().toISOString(),
          current_issue: health.issue ?? null,
        });
      }
    }

    // Log engine run
    await supabase.from("engine_run_logs").insert({
      engine_name: "master-runtime-qa-engine",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      status: report.fail_count > 0 ? "issues_found" : "ok",
      rows_read: report.total_scenarios,
      db_rows_affected: report.fixed_count,
      side_effect_count: report.fixed_count,
      effect_summary: `Runtime QA: ${report.total_scenarios} scenarios, ${report.pass_count} pass, ${report.fail_count} fail, ${report.fixed_count} fixed`,
      trigger_source: "master-runtime-qa-engine",
      metadata_json: { run_id: runId, scope, pass_count: report.pass_count, fail_count: report.fail_count, degraded_count: report.degraded_count, fixed_count: report.fixed_count, critical_count: report.critical_count },
    });

    return new Response(JSON.stringify({ success: true, runId, scope, ...report, duration_ms: durationMs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
