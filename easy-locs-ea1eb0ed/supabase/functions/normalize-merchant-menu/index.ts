import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    const prompt = `Normalize this merchant menu list into clean structured JSON.
Return strictly JSON array with: category_name, item_name, item_description, tags, suggested_image_prompt
Items: ${JSON.stringify(items)}`;

    // Use Lovable AI proxy
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const res = await fetch(`${supabaseUrl}/functions/v1/ops-ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You normalize merchant food menus into clean JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const json = await res.json();
    const answer = json?.answer ?? "[]";

    return new Response(JSON.stringify({ result: answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
