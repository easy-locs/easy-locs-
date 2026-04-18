import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { arcjetProtect, shieldMiddleware, arcjetDenyResponse } from "../_shared/arcjet-shield.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const BOLDSIGN_API_BASE = "https://api.boldsign.com/v1";

function getBoldSignKey(): string {
  const key = Deno.env.get("BOLDSIGN_API_KEY");
  if (!key) throw new Error("BOLDSIGN_API_KEY not configured");
  return key;
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyEnvelopeOwnership(
  db: ReturnType<typeof createClient>,
  envelopeId: string,
  userId: string
): Promise<boolean> {
  const { data } = await db
    .from("lease_signatures")
    .select("created_by")
    .eq("envelope_id", envelopeId)
    .single();

  return data?.created_by === userId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const shieldResult = await arcjetProtect(req, shieldMiddleware("sensitive"));
  if (shieldResult.decision === "deny") return arcjetDenyResponse(shieldResult);

  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_lease_envelope") {
      const { leaseId, documentUrl, landlordEmail, landlordName, tenantEmail, tenantName, title } = body;

      if (!leaseId || !documentUrl || !landlordEmail || !tenantEmail) {
        return jsonResponse({
          error: "leaseId, documentUrl, landlordEmail, and tenantEmail are required",
        }, 400);
      }

      const { data: lease } = await db
        .from("leases")
        .select("id, landlord_id, tenant_id")
        .eq("id", leaseId)
        .single();

      if (!lease) {
        return jsonResponse({ error: "Lease not found" }, 404);
      }

      if (lease.landlord_id !== authCheck.userId && lease.tenant_id !== authCheck.userId) {
        return jsonResponse({ error: "You are not authorized to create signatures for this lease" }, 403);
      }

      const apiKey = getBoldSignKey();

      const envelopePayload = {
        title: title ?? `Lease Agreement - ${leaseId}`,
        message: "Please review and sign this lease agreement.",
        signers: [
          {
            name: landlordName ?? "Landlord",
            emailAddress: landlordEmail,
            signerOrder: 1,
            signerType: "Signer",
            formFields: [{
              fieldType: "Signature",
              pageNumber: 1,
              bounds: { x: 100, y: 700, width: 200, height: 30 },
              isRequired: true,
            }],
          },
          {
            name: tenantName ?? "Tenant",
            emailAddress: tenantEmail,
            signerOrder: 2,
            signerType: "Signer",
            formFields: [{
              fieldType: "Signature",
              pageNumber: 1,
              bounds: { x: 100, y: 750, width: 200, height: 30 },
              isRequired: true,
            }],
          },
        ],
        fileUrls: [documentUrl],
        enableSigningOrder: true,
        expiryDays: 30,
        reminderSettings: {
          enableAutoReminder: true,
          reminderDays: 3,
          reminderCount: 3,
        },
      };

      const response = await fetch(`${BOLDSIGN_API_BASE}/document/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(envelopePayload),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`BoldSign envelope creation failed [${response.status}]: ${err}`);
      }

      const data = await response.json();

      await db.from("lease_signatures").upsert({
        lease_id: leaseId,
        envelope_id: data.documentId,
        status: "sent",
        landlord_email: landlordEmail,
        tenant_email: tenantEmail,
        created_by: authCheck.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "lease_id" });

      return jsonResponse({
        success: true,
        envelopeId: data.documentId,
        status: "sent",
      });
    }

    if (action === "get_envelope_status") {
      const { envelopeId } = body;
      if (!envelopeId) {
        return jsonResponse({ error: "envelopeId is required" }, 400);
      }

      const isOwner = await verifyEnvelopeOwnership(db, envelopeId, authCheck.userId!);
      if (!isOwner) {
        return jsonResponse({ error: "You are not authorized to view this envelope" }, 403);
      }

      const apiKey = getBoldSignKey();
      const response = await fetch(`${BOLDSIGN_API_BASE}/document/properties?documentId=${envelopeId}`, {
        headers: { "X-API-KEY": apiKey },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`BoldSign status fetch failed [${response.status}]: ${err}`);
      }

      const data = await response.json();
      return jsonResponse({
        envelopeId: data.documentId,
        status: data.status,
        signers: (data.signerDetails as Array<{ signerName: string; signerEmail: string; status: string; signedDate: string }> ?? []).map((s) => ({
          name: s.signerName,
          email: s.signerEmail,
          status: s.status,
          signedAt: s.signedDate,
        })),
      });
    }

    if (action === "download_signed") {
      const { envelopeId } = body;
      if (!envelopeId) {
        return jsonResponse({ error: "envelopeId is required" }, 400);
      }

      const isOwner = await verifyEnvelopeOwnership(db, envelopeId, authCheck.userId!);
      if (!isOwner) {
        return jsonResponse({ error: "You are not authorized to download this document" }, 403);
      }

      const apiKey = getBoldSignKey();
      const response = await fetch(`${BOLDSIGN_API_BASE}/document/download?documentId=${envelopeId}`, {
        headers: { "X-API-KEY": apiKey },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`BoldSign download failed [${response.status}]: ${err}`);
      }

      const pdfBlob = await response.blob();
      const storagePath = `leases/signed/${envelopeId}.pdf`;

      const { error: uploadError } = await db.storage
        .from("private-documents")
        .upload(storagePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.warn("[esign] Storage upload error:", uploadError.message);
      }

      await db.from("lease_signatures")
        .update({
          status: "completed",
          signed_document_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("envelope_id", envelopeId);

      const { data: signedUrlData } = await db.storage
        .from("private-documents")
        .createSignedUrl(storagePath, 3600);

      return jsonResponse({
        success: true,
        documentPath: storagePath,
        downloadUrl: signedUrlData?.signedUrl ?? null,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[esign-create-envelope]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
