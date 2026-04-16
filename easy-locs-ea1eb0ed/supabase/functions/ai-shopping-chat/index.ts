import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { aiModelRoute } from "../_shared/ai-model-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, system, shop_id } = await req.json();

    const chatMessages = [
      { role: "system", content: system },
      ...messages,
    ];

    const result = await aiModelRoute({
      messages: chatMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    if (!result.response.ok) {
      console.error("[ai-shopping-chat] AI error:", result.response.status);
      return new Response(JSON.stringify({ reply: "I'm having trouble thinking right now. Please try again!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await result.response.json();
    let reply: string;

    if (result.provider === "anthropic") {
      reply = data.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text ?? "";
    } else {
      reply = data?.choices?.[0]?.message?.content ?? "";
    }

    if (!reply) reply = "I couldn't process that. Could you rephrase?";

    return new Response(JSON.stringify({ reply, provider: result.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ reply: "Something went wrong. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
