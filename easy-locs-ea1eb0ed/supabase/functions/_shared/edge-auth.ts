import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export function requireServiceRole(req: Request): { authorized: boolean; response?: Response } {
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!authHeader) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");

  if (token === supabaseKey) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: new Response(
      JSON.stringify({ error: "Unauthorized: service role key required" }),
      { status: 403, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    ),
  };
}

export async function requireAuthenticatedUser(req: Request): Promise<{ authorized: boolean; userId?: string; response?: Response }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!authHeader) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");

  if (token === supabaseKey) {
    return { authorized: true, userId: "service_role" };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        authorized: false,
        response: new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        ),
      };
    }

    return { authorized: true, userId: user.id };
  } catch {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: "Auth verification failed" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      ),
    };
  }
}
