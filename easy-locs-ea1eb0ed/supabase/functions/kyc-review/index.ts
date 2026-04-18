import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReviewRequest {
  documentId: string;
  action: "approve" | "reject";
  reason?: string;
}

const KYC_LEVEL_ORDER = ["none", "basic", "standard", "enhanced", "full"];

const LEVEL_REQUIRED_DOCS: Record<string, string[]> = {
  basic: ["selfie"],
  standard: ["national_id", "selfie"],
  enhanced: ["national_id", "selfie", "utility_bill"],
  full: ["passport", "selfie", "utility_bill", "bank_statement"],
};

function computeKycLevel(approvedDocTypes: string[]): string {
  const set = new Set(approvedDocTypes);
  let level = "none";
  for (const [lvl, docs] of Object.entries(LEVEL_REQUIRED_DOCS)) {
    if (docs.every((d) => set.has(d))) {
      level = lvl;
    }
  }
  return level;
}

Deno.serve(withEdgeLogging("kyc-review", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: reviewer } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!reviewer) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: reviewer.id,
      _role: "admin",
    });
    const { data: isOwner } = await supabaseAdmin.rpc("has_role", {
      _user_id: reviewer.id,
      _role: "owner",
    });

    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReviewRequest = await req.json();
    const { documentId, action, reason } = body;

    if (!documentId || !action || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject" && !reason) {
      return new Response(JSON.stringify({ error: "Rejection reason is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: docError } = await supabaseAdmin
      .schema("identity")
      .from("kyc_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    await supabaseAdmin
      .schema("identity")
      .from("kyc_documents")
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.id,
        rejection_reason: action === "reject" ? reason : null,
      })
      .eq("id", documentId);

    const { data: allDocs } = await supabaseAdmin
      .schema("identity")
      .from("kyc_documents")
      .select("document_type, status, submitted_at")
      .eq("user_id", doc.user_id)
      .order("submitted_at", { ascending: false });

    const latestByType = new Map<string, { status: string; document_type: string }>();
    for (const d of (allDocs || []) as { document_type: string; status: string; submitted_at: string }[]) {
      if (!latestByType.has(d.document_type)) {
        latestByType.set(d.document_type, d);
      }
    }
    const currentDocs = Array.from(latestByType.values());

    const approvedTypes = currentDocs
      .filter((d) => d.status === "approved")
      .map((d) => d.document_type);

    const newLevel = computeKycLevel(approvedTypes);

    const hasPending = currentDocs.some((d) => d.status === "pending");
    const hasRejected = currentDocs.some((d) => d.status === "rejected");

    let newKycStatus: string;
    if (hasRejected && !hasPending) {
      newKycStatus = "rejected";
    } else if (hasPending) {
      newKycStatus = "under_review";
    } else if (newLevel !== "none") {
      newKycStatus = "verified";
    } else {
      newKycStatus = "documents_pending";
    }

    const { data: currentProvider } = await supabaseAdmin
      .schema("identity")
      .from("providers")
      .select("kyc_status")
      .eq("user_id", doc.user_id)
      .single();

    const previousStatus = currentProvider?.kyc_status || "not_started";
    const isNewlyVerified = newKycStatus === "verified" && previousStatus !== "verified";

    const updatePayload: Record<string, string | boolean> = {
      kyc_level: newLevel,
      kyc_status: newKycStatus,
    };
    if (isNewlyVerified) {
      updatePayload.verified_at = new Date().toISOString();
      updatePayload.is_active = true;
    }

    await supabaseAdmin
      .schema("identity")
      .from("providers")
      .update(updatePayload)
      .eq("user_id", doc.user_id);

    let notifTitle: string;
    let notifBody: string;
    let notifEventType: string;
    if (action === "approve") {
      notifEventType = "kyc.approved";
      if (isNewlyVerified) {
        notifTitle = "Account Verified";
        notifBody = "Your account is now fully verified. All platform features are unlocked.";
      } else {
        notifTitle = "Document Approved";
        notifBody = `Your ${doc.document_type.replace(/_/g, " ")} has been approved.`;
      }
    } else {
      notifEventType = "kyc.rejected";
      notifTitle = "Document Rejected";
      notifBody = `Your ${doc.document_type.replace(/_/g, " ")} was rejected${reason ? `: ${reason}` : ". Please re-upload."}`;
    }

    try {
      await supabaseAdmin.functions.invoke("notification-dispatcher", {
        body: {
          user_id: doc.user_id,
          event_type: notifEventType,
          title: notifTitle,
          body: notifBody,
          channels: ["push", "in_app", "email"],
          priority: isNewlyVerified ? "high" : "normal",
          data: {
            documentType: doc.document_type,
            newLevel,
            isAccountVerified: isNewlyVerified,
            reason: action === "reject" ? reason : undefined,
          },
        },
      });
    } catch {
      console.warn("Notification dispatch failed (non-blocking)");
    }

    try {
      const channel = supabaseAdmin.channel("kyc-status-changes");
      await channel.send({
        type: "broadcast",
        event: "kyc:status_changed",
        payload: {
          userId: doc.user_id,
          documentId,
          action,
          newKycLevel: newLevel,
          newKycStatus,
          documentType: doc.document_type,
        },
      });
      supabaseAdmin.removeChannel(channel);
    } catch {
      console.warn("Realtime broadcast failed (non-blocking)");
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        action,
        newKycLevel: newLevel,
        newKycStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("kyc-review error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}));
