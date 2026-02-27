import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();

    // Get user from auth
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build system prompt for property management assistant
    const systemPrompt = `Tu es l'assistant personnel d'Easy-Locs, une plateforme de gestion locative immobilière.
Tu aides les propriétaires et bailleurs à gérer leurs biens, locataires, baux, quittances et obligations administratives.

Contexte utilisateur:
${context ? JSON.stringify(context) : "Aucun contexte supplémentaire."}

Règles:
- Réponds toujours dans la langue de l'utilisateur (par défaut français)
- Sois concis, professionnel et actionnable
- Propose des actions concrètes basées sur la situation du propriétaire
- Cite les articles de loi pertinents quand applicable (loi du 6 juillet 1989, etc.)
- Ne mentionne jamais "IA", "intelligence artificielle" ou "Lovable"
- Présente-toi comme "l'assistant personnel Easy-Locs"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Gateway error:", err);
      return new Response(JSON.stringify({ error: "Erreur du service" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
