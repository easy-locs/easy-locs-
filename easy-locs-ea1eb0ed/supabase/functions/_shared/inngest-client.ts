const INNGEST_API_BASE = "https://inn.gs";
const INNGEST_EVENT_KEY_ENV = "INNGEST_EVENT_KEY";
const INNGEST_SIGNING_KEY_ENV = "INNGEST_SIGNING_KEY";

export interface InngestEvent {
  name: string;
  data: Record<string, unknown>;
  user?: { id?: string; email?: string };
  ts?: number;
  v?: string;
}

export interface InngestFunction {
  id: string;
  name: string;
  triggers: Array<{ event: string } | { cron: string }>;
  handler: (ctx: InngestStepContext) => Promise<unknown>;
}

export interface InngestStepContext {
  event: InngestEvent;
  step: {
    run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    sleep: (name: string, duration: string) => Promise<void>;
    sleepUntil: (name: string, date: Date) => Promise<void>;
    sendEvent: (name: string, events: InngestEvent | InngestEvent[]) => Promise<void>;
    waitForEvent: (name: string, opts: { event: string; timeout: string; match?: string }) => Promise<InngestEvent | null>;
  };
  attempt: number;
}

function getEventKey(): string {
  const key = Deno.env.get(INNGEST_EVENT_KEY_ENV);
  if (!key) throw new Error("INNGEST_EVENT_KEY not configured");
  return key;
}

function getSigningKey(): string | null {
  return Deno.env.get(INNGEST_SIGNING_KEY_ENV) ?? null;
}

export async function sendInngestEvent(event: InngestEvent): Promise<{ ids: string[] }> {
  const eventKey = getEventKey();

  const body = [{
    name: event.name,
    data: event.data,
    user: event.user,
    ts: event.ts ?? Date.now(),
    v: event.v ?? "1",
  }];

  const response = await fetch(`${INNGEST_API_BASE}/e/${eventKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Inngest event send failed [${response.status}]: ${err}`);
  }

  return response.json();
}

export async function sendInngestEvents(events: InngestEvent[]): Promise<{ ids: string[] }> {
  const eventKey = getEventKey();

  const body = events.map((e) => ({
    name: e.name,
    data: e.data,
    user: e.user,
    ts: e.ts ?? Date.now(),
    v: e.v ?? "1",
  }));

  const response = await fetch(`${INNGEST_API_BASE}/e/${eventKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Inngest events send failed [${response.status}]: ${err}`);
  }

  return response.json();
}

export function defineInngestFunction(config: {
  id: string;
  name: string;
  triggers: Array<{ event: string } | { cron: string }>;
  retries?: number;
  concurrency?: number;
  rateLimit?: { limit: number; period: string; key?: string };
  handler: (ctx: InngestStepContext) => Promise<unknown>;
}): InngestFunction {
  return {
    id: config.id,
    name: config.name,
    triggers: config.triggers,
    handler: config.handler,
  };
}

export const inngestFunctions = {
  paymentReconciliation: defineInngestFunction({
    id: "payment-reconciliation",
    name: "Daily Payment Reconciliation",
    triggers: [{ cron: "0 2 * * *" }, { event: "payment/reconcile" }],
    retries: 3,
    handler: async ({ step }) => {
      const pendingPayments = await step.run("fetch-pending-payments", async () => {
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data, error } = await db.from("wallet_transactions")
          .select("id, amount, status, created_at")
          .eq("status", "pending")
          .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (error) throw new Error(`Failed to fetch pending payments: ${error.message}`);
        return { count: data?.length ?? 0, items: data ?? [] };
      });

      const reconciled = await step.run("reconcile-payments", async () => {
        if (pendingPayments.count === 0) return { reconciled: 0 };

        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        let reconciledCount = 0;
        for (const payment of pendingPayments.items) {
          const { error } = await db.from("wallet_transactions")
            .update({ status: "reconciled", reconciled_at: new Date().toISOString() })
            .eq("id", payment.id)
            .eq("status", "pending");

          if (!error) reconciledCount++;
        }
        return { reconciled: reconciledCount };
      });

      return { status: "completed", ...reconciled };
    },
  }),

  newListingPipeline: defineInngestFunction({
    id: "new-listing-pipeline",
    name: "New Listing Data Pipeline",
    triggers: [{ event: "listing/created" }],
    retries: 5,
    handler: async ({ event, step }) => {
      const listingId = event.data.listingId as string;

      await step.run("validate-listing", async () => {
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data, error } = await db.from("listings")
          .select("id, title, description, status")
          .eq("id", listingId)
          .single();

        if (error || !data) throw new Error(`Listing ${listingId} not found: ${error?.message}`);
        if (!data.title || !data.description) throw new Error(`Listing ${listingId} missing required fields`);
        return { valid: true, title: data.title };
      });

      await step.run("generate-embeddings", async () => {
        const { generateEmbedding } = await import("./embedding-client.ts");
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data: listing } = await db.from("listings")
          .select("title, description, category, city")
          .eq("id", listingId)
          .single();

        if (!listing) throw new Error(`Listing ${listingId} not found for embedding`);

        const text = [listing.title, listing.description, listing.category, listing.city].filter(Boolean).join(". ");
        const result = await generateEmbedding(text);

        const { error } = await db.from("entity_embeddings").upsert({
          entity_id: listingId,
          entity_type: "listing",
          embedding: `[${result.embedding.join(",")}]`,
          text_content: text.slice(0, 2000),
          model: result.model,
          updated_at: new Date().toISOString(),
        }, { onConflict: "entity_id,entity_type" });

        if (error) throw new Error(`Failed to store embedding: ${error.message}`);
        return { embedded: true };
      });

      return { listingId, status: "pipeline_complete" };
    },
  }),

  notificationDigest: defineInngestFunction({
    id: "notification-digest",
    name: "Hourly Notification Digest",
    triggers: [{ cron: "0 * * * *" }, { event: "notification/digest" }],
    retries: 2,
    handler: async ({ step }) => {
      const pendingNotifications = await step.run("fetch-pending-notifications", async () => {
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data, error } = await db.from("notifications")
          .select("id, user_id, type, title, body, created_at")
          .eq("delivered", false)
          .eq("digest_eligible", true)
          .order("created_at", { ascending: true });

        if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);

        const userMap = new Map<string, number>();
        for (const n of data ?? []) {
          userMap.set(n.user_id, (userMap.get(n.user_id) ?? 0) + 1);
        }

        return { count: data?.length ?? 0, users: Array.from(userMap.keys()) };
      });

      if (pendingNotifications.count === 0) {
        return { status: "completed", sent: 0 };
      }

      const sent = await step.run("send-digests", async () => {
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        for (const userId of pendingNotifications.users) {
          const { data: notifications } = await db
            .from("notifications")
            .select("title, body, created_at")
            .eq("user_id", userId)
            .eq("delivered", false)
            .order("created_at", { ascending: false })
            .limit(10);

          if (notifications && notifications.length > 0) {
            await sendInngestEvent({
              name: "email/send",
              data: {
                to: userId,
                subject: `You have ${notifications.length} unread notifications`,
                template: "notification_digest",
                context: { notifications },
              },
            });
          }
        }

        const { error } = await db.from("notifications")
          .update({ delivered: true, delivered_at: new Date().toISOString() })
          .eq("delivered", false)
          .eq("digest_eligible", true);

        if (error) console.warn("[inngest] Failed to mark notifications delivered:", error.message);
        return { sent: pendingNotifications.users.length };
      });

      return { status: "completed", ...sent };
    },
  }),

  reportGeneration: defineInngestFunction({
    id: "report-generation",
    name: "Monthly Report Generation",
    triggers: [{ event: "report/generate" }, { cron: "0 6 1 * *" }],
    retries: 2,
    handler: async ({ event, step }) => {
      const reportType = (event.data?.type as string) ?? "monthly";

      const metrics = await step.run("gather-metrics", async () => {
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

      return { report_type: reportType, metrics };
    },
  }),

  embeddingSync: defineInngestFunction({
    id: "embedding-sync",
    name: "Re-embed Updated Records",
    triggers: [{ event: "record/updated" }, { cron: "*/30 * * * *" }],
    retries: 3,
    concurrency: 5,
    handler: async ({ step }) => {
      const records = await step.run("fetch-stale-records", async () => {
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await db.from("entity_embeddings")
          .select("entity_id, entity_type, updated_at")
          .lt("updated_at", cutoff)
          .limit(100);

        if (error) throw new Error(`Failed to fetch stale records: ${error.message}`);
        return { count: data?.length ?? 0, items: data ?? [] };
      });

      if (records.count === 0) {
        return { status: "completed", embedded: 0 };
      }

      const result = await step.run("re-embed-records", async () => {
        const { generateEmbedding } = await import("./embedding-client.ts");
        const { createClient } = await import("npm:@supabase/supabase-js@2.57.2");
        const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        let embedded = 0;
        for (const record of records.items) {
          try {
            const { data: entity } = await db.from(record.entity_type === "listing" ? "listings" : "profiles")
              .select("*")
              .eq("id", record.entity_id)
              .single();

            if (!entity) continue;

            const text = [entity.title ?? entity.name, entity.description].filter(Boolean).join(". ");
            const result = await generateEmbedding(text);

            await db.from("entity_embeddings").update({
              embedding: `[${result.embedding.join(",")}]`,
              text_content: text.slice(0, 2000),
              model: result.model,
              updated_at: new Date().toISOString(),
            }).eq("entity_id", record.entity_id).eq("entity_type", record.entity_type);

            embedded++;
          } catch (err) {
            console.warn(`[inngest] Failed to re-embed ${record.entity_id}:`, (err as Error).message);
          }
        }
        return { embedded };
      });

      return { status: "completed", ...result };
    },
  }),
};
