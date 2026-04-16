import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { aiRouteAndParse } from "../_shared/ai-router.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, system, shop_id } = await req.json();

    let reply: string;
    try {
      const result = await aiRouteAndParse({
        messages: [
          { role: "system", content: system },
          ...messages,
        ],
        max_tokens: 500,
      });
      reply = result.content || "I couldn't process that. Could you rephrase?";
    } catch (err) {
      console.error("AI router error:", err);
      reply = "I'm having trouble thinking right now. Please try again!";
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ reply: "Something went wrong. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
