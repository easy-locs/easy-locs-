import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { inngestFunctions, sendInngestEvent } from "../_shared/inngest-client.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function computeHmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyInngestSignature(req: Request, bodyText: string): Promise<boolean> {
  const signingKey = Deno.env.get("INNGEST_SIGNING_KEY");
  if (!signingKey) {
    console.warn("[inngest-handler] INNGEST_SIGNING_KEY not set — rejecting request");
    return false;
  }

  const signature = req.headers.get("x-inngest-signature");
  if (!signature) return false;

  const parts = new Map<string, string>();
  for (const part of signature.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) parts.set(part.substring(0, eqIdx), part.substring(eqIdx + 1));
  }

  const ts = parts.get("t");
  const sig = parts.get("s");
  if (!ts || !sig) return false;

  const now = Math.floor(Date.now() / 1000);
  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) return false;

  const expectedSig = await computeHmac(signingKey, `${ts}${bodyText}`);
  return sig === expectedSig;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const bodyText = req.method === "POST" ? await req.text() : "";

  const auth = requireServiceRole(req);
  const isServiceRole = auth.authorized;
  let isInngestCall = false;

  if (!isServiceRole) {
    isInngestCall = await verifyInngestSignature(req, bodyText);
    if (!isInngestCall) {
      return jsonResponse({ error: "Unauthorized: service role or valid Inngest signature required" }, 403);
    }
  }

  try {
    if (req.method === "GET") {
      const functions = Object.values(inngestFunctions).map((fn) => ({
        id: fn.id,
        name: fn.name,
        triggers: fn.triggers,
      }));

      return jsonResponse({
        framework: "supabase-edge",
        appName: "easy-locs",
        functions,
        sdkVersion: "1.0.0",
      });
    }

    if (req.method === "POST") {
      const body = JSON.parse(bodyText);
      const { action, eventName, eventData, userId, functionId, event } = body;

      if (action === "trigger") {
        if (!eventName) {
          return jsonResponse({ error: "eventName is required" }, 400);
        }

        const result = await sendInngestEvent({
          name: eventName,
          data: eventData ?? {},
          user: userId ? { id: userId } : undefined,
        });

        trackBackendEvent(userId ?? "system", "inngest.event_triggered", { eventName });

        return jsonResponse({ success: true, eventIds: result.ids });
      }

      if (action === "list_functions") {
        const functions = Object.values(inngestFunctions).map((fn) => ({
          id: fn.id,
          name: fn.name,
          triggers: fn.triggers,
        }));
        return jsonResponse({ functions });
      }

      if (action === "execute") {
        if (!isServiceRole) {
          return jsonResponse({ error: "execute requires service role authorization" }, 403);
        }

        const fn = Object.values(inngestFunctions).find((f) => f.id === functionId);
        if (!fn) {
          return jsonResponse({ error: `Function ${functionId} not found` }, 404);
        }

        const stepResults: Record<string, unknown> = {};
        const stepContext = {
          run: async <T>(name: string, stepFn: () => Promise<T>): Promise<T> => {
            const result = await stepFn();
            stepResults[name] = result;
            return result;
          },
          sleep: async (_name: string, _duration: string): Promise<void> => {
            console.info(`[inngest-handler] Step sleep: ${_name} (${_duration})`);
          },
          sleepUntil: async (_name: string, _date: Date): Promise<void> => {
            console.info(`[inngest-handler] Step sleepUntil: ${_name}`);
          },
          sendEvent: async (_name: string, events: unknown): Promise<void> => {
            console.info("[inngest-handler] Step sendEvent:", events);
          },
          waitForEvent: async (_name: string, _opts: unknown): Promise<null> => null,
        };

        const result = await fn.handler({
          event: event ?? { name: functionId, data: {} },
          step: stepContext,
          attempt: 0,
        });

        trackBackendEvent("system", "inngest.function_executed", { functionId });

        return jsonResponse({ success: true, result, stepResults });
      }

      if (body?.event?.name || body?.fn_id) {
        const inngestEventName = body.event?.name;
        const fnId = body.fn_id;

        const fn = fnId
          ? Object.values(inngestFunctions).find((f) => f.id === fnId)
          : Object.values(inngestFunctions).find((f) =>
              f.triggers.some((t) => "event" in t && t.event === inngestEventName)
            );

        if (!fn) {
          return jsonResponse({ error: "No matching function" }, 404);
        }

        const stepResults: Record<string, unknown> = {};
        const stepContext = {
          run: async <T>(name: string, stepFn: () => Promise<T>): Promise<T> => {
            const result = await stepFn();
            stepResults[name] = result;
            return result;
          },
          sleep: async (_name: string, _duration: string): Promise<void> => {
            console.info(`[inngest-handler] Step sleep: ${_name} (${_duration})`);
          },
          sleepUntil: async (_name: string, _date: Date): Promise<void> => {
            console.info(`[inngest-handler] Step sleepUntil: ${_name}`);
          },
          sendEvent: async (_name: string, events: unknown): Promise<void> => {
            console.info("[inngest-handler] Step sendEvent:", events);
          },
          waitForEvent: async (_name: string, _opts: unknown): Promise<null> => null,
        };

        const result = await fn.handler({
          event: body.event ?? { name: fn.id, data: {} },
          step: stepContext,
          attempt: body.attempt ?? 0,
        });

        return jsonResponse({ status: "completed", result, stepResults });
      }

      return jsonResponse({ error: "Unknown action" }, 400);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[inngest-handler]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
