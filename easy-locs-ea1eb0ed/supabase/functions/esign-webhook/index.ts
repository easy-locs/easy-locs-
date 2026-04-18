import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

async function verifyBoldSignSignature(req: Request, body: string): Promise<boolean> {
  const webhookSecret = Deno.env.get("BOLDSIGN_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.warn("[esign-webhook] BOLDSIGN_WEBHOOK_SECRET not set — rejecting unsigned request");
    return false;
  }

  const signature = req.headers.get("x-boldsign-signature") ?? req.headers.get("x-webhook-signature");
  if (!signature) {
    console.warn("[esign-webhook] No signature header found");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const sigToVerify = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    return computedSignature === sigToVerify.toLowerCase();
  } catch (err) {
    console.error("[esign-webhook] Signature verification error:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const rawBody = await req.text();

    const isValid = await verifyBoldSignSignature(req, rawBody);
    if (!isValid) {
      console.warn("[esign-webhook] Invalid or missing webhook signature — rejecting");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
    const { event } = body;

    console.info(`[esign-webhook] Received event: ${JSON.stringify(event)}`);

    const documentId = event?.documentId ?? body.documentId;
    const eventType = event?.eventType ?? body.eventType;

    if (!documentId || !eventType) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusMap: Record<string, string> = {
      Signed: "signed",
      Completed: "completed",
      Declined: "declined",
      Expired: "expired",
      Revoked: "revoked",
      Reassigned: "reassigned",
      Viewed: "viewed",
      Sent: "sent",
    };

    const mappedStatus = statusMap[eventType] ?? eventType.toLowerCase();

    const { error } = await db.from("lease_signatures")
      .update({
        status: mappedStatus,
        webhook_payload: body,
        updated_at: new Date().toISOString(),
      })
      .eq("envelope_id", documentId);

    if (error) {
      console.warn("[esign-webhook] Update error:", error.message);
    }

    if (mappedStatus === "completed") {
      const { data: signature } = await db.from("lease_signatures")
        .select("lease_id")
        .eq("envelope_id", documentId)
        .single();

      if (signature?.lease_id) {
        await db.from("leases")
          .update({
            signature_status: "completed",
            signed_at: new Date().toISOString(),
          })
          .eq("id", signature.lease_id);
      }
    }

    return new Response(JSON.stringify({ received: true, status: mappedStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[esign-webhook]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
