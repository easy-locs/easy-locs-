import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withEdgeLogging } from "../_shared/with-logging.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { checkPlaidHealth } from "../_shared/plaid-health.ts";
import { checkLiveKitHealth } from "../_shared/livekit-health.ts";
import { isMeilisearchAvailable, getMeilisearchHealth } from "../_shared/search-engine-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ServiceHealth {
  status: "ok" | "error" | "not_configured";
  latencyMs?: number;
  error?: string;
  version?: string;
}

function dedupeKeyForService(service: string): string {
  const window = new Date();
  window.setMinutes(0, 0, 0);
  return `integration_down_${service}_${window.toISOString()}`;
}

Deno.serve(withEdgeLogging("integration-health-monitor", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const [plaid, livekit, meilisearch] = await Promise.all([
      checkPlaidHealth(),
      checkLiveKitHealth(),
      (async (): Promise<ServiceHealth> => {
        if (!isMeilisearchAvailable()) return { status: "not_configured" };
        const health = await getMeilisearchHealth();
        if (!health) return { status: "error", error: "Meilisearch unreachable" };
        return { status: "ok", version: health.version };
      })(),
    ]);

    const services: Record<string, ServiceHealth> = { plaid, livekit, meilisearch };

    const failedServices = Object.entries(services)
      .filter(([_, s]) => s.status === "error");

    logger.info("health_check_complete", {
      plaid: plaid.status,
      livekit: livekit.status,
      meilisearch: meilisearch.status,
      failedCount: failedServices.length,
    });

    if (failedServices.length === 0) {
      return new Response(
        JSON.stringify({
          status: "all_healthy",
          services,
          notifications_sent: 0,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["admin", "super_admin"]);

    if (adminError || !admins || admins.length === 0) {
      logger.warn("no_admins_found", { error: adminError?.message });
      return new Response(
        JSON.stringify({
          status: "alert_failed",
          services,
          notifications_sent: 0,
          error: adminError ? adminError.message : "No admin users found to notify",
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const failedNames = failedServices.map(([name]) => name);

    let notificationsSent = 0;
    let notificationsDeduplicated = 0;
    let notificationsFailed = 0;

    for (const admin of admins) {
      for (const [serviceName, serviceHealth] of failedServices) {
        const dedupe = dedupeKeyForService(serviceName);

        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/notification-dispatcher`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: admin.id,
              event_type: "integration_outage",
              title: `Integration down: ${serviceName}`,
              body: `${serviceName} is reporting an error: ${serviceHealth.error ?? "unknown error"}`,
              channels: ["in_app", "email"],
              priority: "critical",
              dedupe_key: `${dedupe}_${admin.id}`,
              data: {
                domain: "system",
                actor: "integration-health-monitor",
                service_name: serviceName,
                service_error: serviceHealth.error,
                service_latency_ms: serviceHealth.latencyMs,
              },
              action_url: "/admin/system",
            }),
          });

          if (resp.ok) {
            const result = await resp.json();
            if (result.status === "deduplicated") {
              notificationsDeduplicated++;
            } else {
              notificationsSent++;
            }
            logger.info("notification_sent", {
              adminId: admin.id,
              service: serviceName,
              result: result.status,
            });
          } else {
            notificationsFailed++;
            const errText = await resp.text().catch(() => "");
            logger.warn("notification_failed", {
              adminId: admin.id,
              service: serviceName,
              status: resp.status,
              error: errText.slice(0, 200),
            });
          }
        } catch (e) {
          notificationsFailed++;
          logger.error("notification_error", {
            adminId: admin.id,
            service: serviceName,
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }
      }
    }

    logger.info("monitor_complete", {
      failedServices: failedNames,
      adminsNotified: admins.length,
      notificationsSent,
      notificationsDeduplicated,
      notificationsFailed,
    });

    const delivered = notificationsSent + notificationsDeduplicated;
    const total = delivered + notificationsFailed;
    const alertDeliveryStatus = notificationsFailed === 0
      ? "sent"
      : delivered === 0
        ? "failed"
        : "partial";

    const httpStatus = alertDeliveryStatus === "failed" ? 500 : 200;

    return new Response(
      JSON.stringify({
        status: "degraded",
        alert_delivery_status: alertDeliveryStatus,
        services,
        failed_services: failedNames,
        admins_found: admins.length,
        notifications_sent: notificationsSent,
        timestamp: new Date().toISOString(),
      }),
      { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("monitor_error", { error: e instanceof Error ? e : new Error(msg) });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
}));
