import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  try {
    const { tokens, title, body, data } = await req.json();

    if (!Array.isArray(tokens) || !tokens.length || !title) {
      return new Response(JSON.stringify({ error: "tokens[] and title required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // DEV: log push payload. In production, call FCM / APNS here.
    console.log("[PUSH]", { tokenCount: tokens.length, title, body, data });

    // Example FCM integration (uncomment when FCM_SERVER_KEY is set):
    // const FCM_KEY = Deno.env.get("FCM_SERVER_KEY");
    // for (const token of tokens) {
    //   await fetch("https://fcm.googleapis.com/fcm/send", {
    //     method: "POST",
    //     headers: {
    //       Authorization: `key=${FCM_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       to: token,
    //       notification: { title, body: body ?? "" },
    //       data: data ?? {},
    //     }),
    //   });
    // }

    return new Response(JSON.stringify({ success: true, sent: tokens.length }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-push error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
