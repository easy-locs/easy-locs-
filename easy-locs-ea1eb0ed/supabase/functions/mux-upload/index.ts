import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { arcjetProtect, shieldMiddleware, arcjetDenyResponse } from "../_shared/arcjet-shield.ts";

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

function getMuxCredentials(): { tokenId: string; tokenSecret: string } {
  const tokenId = Deno.env.get("MUX_TOKEN_ID");
  const tokenSecret = Deno.env.get("MUX_TOKEN_SECRET");
  if (!tokenId || !tokenSecret) throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be configured");
  return { tokenId, tokenSecret };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const shieldResult = await arcjetProtect(req, shieldMiddleware("sensitive"));
  if (shieldResult.decision === "deny") return arcjetDenyResponse(shieldResult);

  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_upload") {
      const { tokenId, tokenSecret } = getMuxCredentials();
      const auth = btoa(`${tokenId}:${tokenSecret}`);

      const response = await fetch("https://api.mux.com/video/v1/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          new_asset_settings: {
            playback_policy: ["public"],
            encoding_tier: "baseline",
          },
          cors_origin: "*",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Mux upload creation failed [${response.status}]: ${err}`);
      }

      const data = await response.json();
      return jsonResponse({
        url: data.data.url,
        id: data.data.id,
        assetId: data.data.asset_id,
      });
    }

    if (action === "get_asset") {
      const { assetId } = body;
      if (!assetId) return jsonResponse({ error: "assetId is required" }, 400);

      const { tokenId, tokenSecret } = getMuxCredentials();
      const auth = btoa(`${tokenId}:${tokenSecret}`);

      const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Mux asset fetch failed [${response.status}]: ${err}`);
      }

      const data = await response.json();
      const asset = data.data;

      return jsonResponse({
        id: asset.id,
        status: asset.status,
        playbackId: asset.playback_ids?.[0]?.id ?? null,
        duration: asset.duration ?? null,
        aspectRatio: asset.aspect_ratio ?? null,
      });
    }

    return jsonResponse({ error: "Unknown action. Use create_upload or get_asset." }, 400);
  } catch (err) {
    console.error("[mux-upload]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
