import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveApiKey(supabaseAdmin: any, apiKey: string) {
  // Hash the key the same way create_api_key does
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, org_id, user_id, scopes, active")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;

  // Update last_used_at (fire-and-forget)
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return data as { id: string; org_id: string; user_id: string; scopes: string[] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // --- Auth ---
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || !token.startsWith("el_")) {
    return json({ error: "Missing or invalid API key. Use Authorization: Bearer el_xxx" }, 401);
  }

  const key = await resolveApiKey(supabaseAdmin, token);
  if (!key) return json({ error: "Invalid or inactive API key" }, 401);

  const orgId = key.org_id;
  const scopes = key.scopes;

  // --- Routing ---
  const url = new URL(req.url);
  // Path after /public-api/v1/...
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Remove "public-api" prefix if present
  const apiIdx = pathParts.indexOf("public-api");
  const relevantParts = apiIdx >= 0 ? pathParts.slice(apiIdx + 1) : pathParts;
  // Remove "v1" prefix if present
  const parts = relevantParts[0] === "v1" ? relevantParts.slice(1) : relevantParts;
  const resource = parts[0] || "";
  const resourceId = parts[1] || null;
  const method = req.method;

  // --- Permission check ---
  const needsWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (needsWrite && !scopes.includes("write")) {
    return json({ error: "API key lacks 'write' scope" }, 403);
  }
  if (method === "GET" && !scopes.includes("read")) {
    return json({ error: "API key lacks 'read' scope" }, 403);
  }

  try {
    switch (resource) {
      case "properties": {
        if (method === "GET") {
          const query = supabaseAdmin.from("properties").select("*").eq("org_id", orgId);
          if (resourceId) query.eq("id", resourceId);
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const offset = parseInt(url.searchParams.get("offset") || "0");
          query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
          const { data, error } = await query;
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        if (method === "POST") {
          const body = await req.json();
          const { data, error } = await supabaseAdmin
            .from("properties")
            .insert({ ...body, org_id: orgId, user_id: key.user_id })
            .select()
            .single();
          if (error) return json({ error: error.message }, 400);
          return json({ data }, 201);
        }
        break;
      }

      case "tenants": {
        if (method === "GET") {
          const query = supabaseAdmin.from("tenants").select("*").eq("org_id", orgId);
          if (resourceId) query.eq("id", resourceId);
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const offset = parseInt(url.searchParams.get("offset") || "0");
          query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
          const { data, error } = await query;
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        if (method === "POST") {
          const body = await req.json();
          const { data, error } = await supabaseAdmin
            .from("tenants")
            .insert({ ...body, org_id: orgId, user_id: key.user_id })
            .select()
            .single();
          if (error) return json({ error: error.message }, 400);
          return json({ data }, 201);
        }
        break;
      }

      case "leases": {
        if (method === "GET") {
          const query = supabaseAdmin.from("leases").select("*").eq("org_id", orgId);
          if (resourceId) query.eq("id", resourceId);
          const { data, error } = await query;
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        break;
      }

      case "rent-calls": {
        if (method === "GET") {
          const query = supabaseAdmin.from("rent_calls").select("*").eq("org_id", orgId);
          if (resourceId) query.eq("id", resourceId);
          const month = url.searchParams.get("month");
          if (month) query.eq("month", month);
          const { data, error } = await query;
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        break;
      }

      case "documents": {
        if (method === "GET") {
          const query = supabaseAdmin.from("documents").select("*").eq("org_id", orgId);
          if (resourceId) query.eq("id", resourceId);
          const docType = url.searchParams.get("doc_type");
          if (docType) query.eq("doc_type", docType);
          const { data, error } = await query;
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        break;
      }

      case "reservations": {
        if (method === "GET") {
          const query = supabaseAdmin.from("booking_requests").select("*").eq("org_id", orgId);
          if (resourceId) query.eq("id", resourceId);
          const { data, error } = await query;
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        break;
      }

      case "accounting": {
        if (parts[1] === "journal" && method === "GET") {
          // Return rent_calls as journal entries
          const { data, error } = await supabaseAdmin
            .from("rent_calls")
            .select("id, month, rent_amount, charges_amount, total_amount, paid, paid_date, tenant_id, property_id")
            .eq("org_id", orgId)
            .order("month", { ascending: false })
            .limit(100);
          if (error) return json({ error: error.message }, 400);
          return json({ data, count: data?.length || 0 });
        }
        break;
      }

      default:
        return json({
          error: "Unknown endpoint",
          available: [
            "GET /v1/properties",
            "POST /v1/properties",
            "GET /v1/tenants",
            "POST /v1/tenants",
            "GET /v1/leases",
            "GET /v1/rent-calls",
            "GET /v1/documents",
            "GET /v1/reservations",
            "GET /v1/accounting/journal",
          ],
        }, 404);
    }

    return json({ error: `Method ${method} not allowed on /${resource}` }, 405);
  } catch (err) {
    console.error("Public API error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
