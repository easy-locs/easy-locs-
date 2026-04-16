import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import {
  createInngestFunction, handleInngestRequest,
  sendInngestEvent, createStepRunner,
} from "../_shared/inngest-client.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

createInngestFunction({
  id: "payment-reconciliation",
  name: "Payment Reconciliation",
  triggers: [{ cron: "0 2 * * *" }, { event: "payment/reconcile" }],
  retries: 3,
  handler: async (event, step) => {
    const db = getSupabase();

    const pendingPayments = await step.run("fetch-pending-payments", async () => {
      const { data } = await db
        .from("transactions")
        .select("id, amount, status, provider, created_at")
        .eq("status", "pending")
        .lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
      return data ?? [];
    });

    const reconciled = await step.run("reconcile-payments", async () => {
      let count = 0;
      for (const payment of pendingPayments) {
        await db.from("transactions")
          .update({ status: "reconciled", updated_at: new Date().toISOString() })
          .eq("id", payment.id);
        count++;
      }
      return count;
    });

    trackBackendEvent("system", "payment.reconciliation_completed", {
      reconciled,
      total_pending: pendingPayments.length,
    });

    return { reconciled, processed: pendingPayments.length };
  },
});

createInngestFunction({
  id: "notification-digest",
  name: "Notification Digest",
  triggers: [{ cron: "0 9 * * *" }, { event: "notification/digest" }],
  retries: 2,
  handler: async (event, step) => {
    const db = getSupabase();

    const users = await step.run("fetch-digest-users", async () => {
      const { data } = await db
        .from("profiles")
        .select("id, email, full_name")
        .eq("notification_digest", true)
        .limit(500);
      return data ?? [];
    });

    let sent = 0;
    for (const user of users) {
      await step.run(`send-digest-${user.id}`, async () => {
        const { data: notifications } = await db
          .from("notifications")
          .select("title, body, created_at")
          .eq("user_id", user.id)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(10);

        if (notifications && notifications.length > 0) {
          await sendInngestEvent({
            name: "email/send",
            data: {
              to: user.email,
              subject: `You have ${notifications.length} unread notifications`,
              template: "notification_digest",
              context: { notifications, user_name: user.full_name },
            },
          });
          sent++;
        }
      });
    }

    return { users_processed: users.length, digests_sent: sent };
  },
});

createInngestFunction({
  id: "data-pipeline-stage",
  name: "Data Pipeline Stage",
  triggers: [{ event: "pipeline/stage" }],
  retries: 3,
  handler: async (event, step) => {
    const { stage, payload } = event.data;
    const db = getSupabase();

    if (stage === "extract") {
      return step.run("extract-data", async () => {
        console.log("[inngest] Extracting data:", payload);
        return { stage: "extract", status: "completed" };
      });
    }

    if (stage === "transform") {
      return step.run("transform-data", async () => {
        console.log("[inngest] Transforming data:", payload);
        return { stage: "transform", status: "completed" };
      });
    }

    if (stage === "load") {
      return step.run("load-data", async () => {
        console.log("[inngest] Loading data:", payload);
        return { stage: "load", status: "completed" };
      });
    }

    return { stage, status: "unknown_stage" };
  },
});

createInngestFunction({
  id: "report-generation",
  name: "Report Generation",
  triggers: [{ event: "report/generate" }, { cron: "0 6 1 * *" }],
  retries: 2,
  handler: async (event, step) => {
    const db = getSupabase();
    const reportType = event.data?.type ?? "monthly";

    const metrics = await step.run("gather-metrics", async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: bookingsCount } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart);

      const { count: usersCount } = await db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart);

      return {
        bookings: bookingsCount ?? 0,
        new_users: usersCount ?? 0,
        period: monthStart,
      };
    });

    trackBackendEvent("system", "report.generated", {
      report_type: reportType,
      ...metrics,
    });

    return { report_type: reportType, metrics };
  },
});

async function computeHmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyInngestSignature(req: Request): Promise<{ valid: boolean; body?: string }> {
  const signingKey = Deno.env.get("INNGEST_SIGNING_KEY");
  if (!signingKey) return { valid: false };

  const signature = req.headers.get("x-inngest-signature");
  if (!signature) return { valid: false };

  const parts = new Map<string, string>();
  for (const part of signature.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) parts.set(part.substring(0, eqIdx), part.substring(eqIdx + 1));
  }

  const ts = parts.get("t");
  const sig = parts.get("s");
  if (!ts || !sig) return { valid: false };

  const now = Math.floor(Date.now() / 1000);
  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) return { valid: false };

  const body = await req.text();
  const expectedSig = await computeHmac(signingKey, `${ts}${body}`);

  if (sig !== expectedSig) return { valid: false };

  return { valid: true, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  let verifiedBody: string | undefined;
  if (!auth.authorized) {
    const sigResult = await verifyInngestSignature(req);
    if (!sigResult.valid) {
      return new Response(JSON.stringify({ error: "Unauthorized: service role or valid Inngest signature required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    verifiedBody = sigResult.body;
  }

  const requestForHandler = verifiedBody
    ? new Request(req.url, { method: req.method, headers: req.headers, body: verifiedBody })
    : req;

  const resp = await handleInngestRequest(requestForHandler);
  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
