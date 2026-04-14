import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rlResult = await checkServerRateLimit(req, "tenant-signup", { maxRequests: 5, windowSeconds: 60 });
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  try {
    const { email, password, name, token } = await req.json();

    if (!email || !password || !token) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Validate the invitation token
    const { data: inv, error: invErr } = await adminClient.rpc("validate_tenant_invitation", { _token: token });
    if (invErr || !inv || !(inv as any).valid) {
      return new Response(JSON.stringify({ error: "Invitation invalide ou expirée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Try to create the user with auto-confirm
    let userId: string | null = null;

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: "tenant" },
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Impossible de créer le compte" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Ensure profile exists with tenant type
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!profile) {
      await adminClient.from("profiles").insert({
        id: userId,
        email,
        name: name || (inv as any).tenant_name || "",
        user_type: "tenant",
        onboarding_completed: true,
      });
    } else {
      await adminClient.from("profiles").update({
        user_type: "tenant",
        onboarding_completed: true,
      }).eq("id", userId);
    }

    // 4. Accept the invitation
    const { data: acceptResult, error: acceptErr } = await adminClient.rpc("accept_tenant_invitation", {
      _token: token,
      _user_id: userId,
    });

    if (acceptErr) {
      return new Response(JSON.stringify({ error: "Erreur lors de l'activation: " + acceptErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = acceptResult as any;
    if (!result?.success) {
      return new Response(JSON.stringify({ error: result?.error || "Activation échouée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[tenant-signup] Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
