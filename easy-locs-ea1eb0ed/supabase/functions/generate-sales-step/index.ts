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
    const lead = body?.lead ?? {};
    const step = body?.step ?? {};

    const prompt = `
Create a short personalized outbound message.
Target lead:
${JSON.stringify(lead)}
Step:
${JSON.stringify(step)}

Rules:
- practical
- high conversion
- short
- business tone
- output plain text only
`;

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
          { role: "system", content: "You write concise outbound sales messages." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const json = await res.json();
    const output = json?.choices?.[0]?.message?.content ?? json?.reply ?? step.template ?? "";

    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
