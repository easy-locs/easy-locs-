import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { confirmation } = await req.json();

    if (confirmation !== "DELETE_MY_ACCOUNT") {
      return new Response(
        JSON.stringify({ error: "Invalid confirmation. Send { confirmation: 'DELETE_MY_ACCOUNT' }" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const deletionDate = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const anonymizedName = `deleted_user_${userId.slice(0, 8)}`;
    const anonymizedEmail = `deleted_${userId.slice(0, 8)}@anonymized.local`;

    const { error: profileError } = await supabase.from("profiles").update({
      name: anonymizedName,
      email: anonymizedEmail,
      phone: null,
      avatar_url: null,
      signature_url: null,
      bio: null,
      country: null,
      locale: null,
      profile_visibility: "private",
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_for: deletionDate,
      status: "pending_deletion",
    } as any).eq("id", userId);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Failed to process deletion", detail: profileError.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("owner_profiles").update({
      company_name: anonymizedName,
      phone: null,
      address: null,
      siret: null,
    } as any).eq("user_id", userId);

    try {
      const { data: files } = await supabase.storage.from("rental-docs").list(userId);
      if (files && files.length > 0) {
        const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
        await supabase.storage.from("rental-docs").remove(paths);
      }
    } catch {}

    try {
      const { data: avatarFiles } = await supabase.storage.from("avatars").list(userId);
      if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((f: { name: string }) => `${userId}/${f.name}`);
        await supabase.storage.from("avatars").remove(paths);
      }
    } catch {}

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "gdpr_account_deletion_requested",
      metadata_json: {
        requested_at: new Date().toISOString(),
        scheduled_deletion: deletionDate,
        original_email: user.email,
        gdpr_article: "Art. 17 — Right to erasure",
        grace_period_days: 30,
      },
    });

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to: user.email,
          subject: "Account Deletion Request — Easy-Locs",
          html: `
            <h2>Account Deletion Request Received</h2>
            <p>We have received your request to delete your Easy-Locs account.</p>
            <p><strong>Your account and all associated data will be permanently deleted on ${new Date(deletionDate).toLocaleDateString("en-GB")}.</strong></p>
            <p>During the 30-day grace period, you can cancel this request by logging in and visiting Settings > Privacy.</p>
            <p>After deletion, this action cannot be undone.</p>
            <p>If you did not request this deletion, please contact us immediately at support@easy-locs.com.</p>
            <br/>
            <p style="color:#666;font-size:12px">GDPR Art. 17 — Right to Erasure</p>
            <p style="color:#666;font-size:12px">Easy-Locs® — Intelligent Property Management</p>
          `,
        }),
      });
    } catch {}

    return new Response(
      JSON.stringify({
        status: "deletion_scheduled",
        scheduled_for: deletionDate,
        grace_period_days: 30,
        message: "Your account deletion has been scheduled. You have 30 days to cancel by logging in.",
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Deletion request failed", detail: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
