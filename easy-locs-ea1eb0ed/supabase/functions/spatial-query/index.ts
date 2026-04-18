import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withEdgeLogging } from "../_shared/with-logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ALLOWED_ENTITY_TYPES = new Set([
  "drivers", "merchants", "listings", "storefronts", "properties", "hotels",
]);

Deno.serve(withEdgeLogging("spatial-query", async (req, logger) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
  if (claimsError || !claimsData?.user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json();
    const { action, lat, lng, radius_meters, entity_type, category, vehicle_type, limit } = body;

    if (lat === undefined || lat === null || lng === undefined || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: "Valid lat/lng required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("spatial_query", { action, lat, lng, radius_meters, entity_type, user_id: claimsData.user.id });

    if (action === "nearby") {
      if (!entity_type || !ALLOWED_ENTITY_TYPES.has(entity_type)) {
        return new Response(JSON.stringify({ error: "Invalid entity_type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const radiusM = Math.min(radius_meters ?? 5000, 50000);
      const queryLimit = Math.min(limit ?? 50, 200);
      const locationCol = entity_type === "drivers" ? "current_location" : "location";

      const { data, error } = await supabase.rpc("spatial_nearby", {
        p_table: entity_type,
        p_location_col: locationCol,
        p_lng: lng,
        p_lat: lat,
        p_radius_meters: radiusM,
        p_limit: queryLimit,
      });

      if (error) {
        const fallbackQuery = `
          SELECT id, name,
            ST_X(${locationCol}::geometry) as lng,
            ST_Y(${locationCol}::geometry) as lat,
            ST_Distance(
              ${locationCol}::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) as distance_meters
          FROM ${entity_type}
          WHERE ST_DWithin(
            ${locationCol}::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
          ORDER BY distance_meters ASC
          LIMIT $4
        `;

        const { data: rawData, error: rawError } = await supabase.rpc("exec_sql", {
          query: fallbackQuery,
          params: [lng, lat, radiusM, queryLimit],
        });

        if (rawError) {
          logger.error("spatial_nearby_failed", { error: rawError });
          return new Response(JSON.stringify({ error: "Spatial query failed", detail: rawError.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ results: rawData ?? [], source: "postgis" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ results: data ?? [], source: "postgis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "zone") {
      const { data, error } = await supabase.rpc("auto_assign_zone", {
        p_lat: lat,
        p_lng: lng,
      });

      if (error) {
        logger.error("zone_assign_failed", { error: error });
        return new Response(JSON.stringify({ error: "Zone assignment failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ zone: data?.[0] ?? null, source: "postgis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "contains") {
      const { data, error } = await supabase.rpc("point_in_zones", {
        p_lng: lng,
        p_lat: lat,
      });

      if (error) {
        logger.error("contains_query_failed", { error: error });
      }

      return new Response(JSON.stringify({ zones: data ?? [], source: "postgis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Unknown action. Use: nearby, zone, contains" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("spatial_query_error", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
