import { createDomainRouter } from "../_shared/domain-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders } from "../_shared/cache-headers.ts";
import { invalidateCacheOnMutation } from "../_shared/edge-cache.ts";
// LB Closeout #852 — translate goes through the platform-native registry so
// every model call is governed (quota, sensitive routing, audit). Direct
// `fetch("https://api.openai.com/...")` is no longer permitted on this surface.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const router = createDomainRouter({
  domain: "orbit",
  routes: [
    {
      method: "POST",
      pattern: "/conversations",
      handler: async (ctx) => {
        const supabase = getSupabase();

        const { data, error } = await supabase
          .from("conversations_v2")
          .select("*")
          .contains("participants", [ctx.userId])
          .order("updated_at", { ascending: false })
          .limit(50);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ conversations: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/conversations/create",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const body = ctx.body as Record<string, unknown>;

        const { data, error } = await supabase
          .from("conversations_v2")
          .insert({
            type: body.type || "direct",
            title: body.title || null,
            participants: body.participants || [ctx.userId],
            listing_id: body.listing_id || null,
            booking_id: body.booking_id || null,
            created_by_orbit_id: ctx.userId,
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation("orbit");
        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ conversation: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/messages",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { conversation_id, limit: reqLimit } = ctx.body as {
          conversation_id: string;
          limit?: number;
        };

        if (!conversation_id) {
          return new Response(
            JSON.stringify({ error: "conversation_id required" }),
            { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: convData } = await supabase
          .from("conversations_v2")
          .select("participants")
          .eq("id", conversation_id)
          .maybeSingle();

        const participants = (convData?.participants as string[]) ?? [];
        const isParticipant = participants.some((p: unknown) => {
          if (typeof p === "string") return p === ctx.userId;
          if (typeof p === "object" && p !== null) {
            const obj = p as Record<string, string>;
            return obj.userId === ctx.userId || obj.orbitId === ctx.userId;
          }
          return false;
        });

        if (!isParticipant && ctx.userId !== "service_role") {
          return new Response(
            JSON.stringify({ error: "Not a participant in this conversation" }),
            { status: 403, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const queryLimit = Math.min(reqLimit ?? 100, 500);

        const { data, error } = await supabase
          .from("chat_messages_v2")
          .select("*")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: true })
          .limit(queryLimit);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cacheHeaders = buildCacheHeaders("user_data");
        return new Response(JSON.stringify({ messages: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/messages/send",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const { conversation_id, body: msgBody, type } = ctx.body as {
          conversation_id: string;
          body: string;
          type?: string;
        };

        if (!conversation_id || !msgBody) {
          return new Response(
            JSON.stringify({ error: "conversation_id and body required" }),
            { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: convData } = await supabase
          .from("conversations_v2")
          .select("participants")
          .eq("id", conversation_id)
          .maybeSingle();

        if (!convData) {
          return new Response(
            JSON.stringify({ error: "Conversation not found" }),
            { status: 404, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const participants = (convData.participants as string[]) ?? [];
        const isParticipant = participants.some((p: unknown) => {
          if (typeof p === "string") return p === ctx.userId;
          if (typeof p === "object" && p !== null) {
            const obj = p as Record<string, string>;
            return obj.userId === ctx.userId || obj.orbitId === ctx.userId;
          }
          return false;
        });

        if (!isParticipant) {
          return new Response(
            JSON.stringify({ error: "Not a participant in this conversation" }),
            { status: 403, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data, error } = await supabase
          .from("chat_messages_v2")
          .insert({
            conversation_id,
            sender_user_id: ctx.userId,
            type: type || "text",
            body: msgBody,
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("conversations_v2")
          .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", conversation_id);

        await invalidateCacheOnMutation("orbit");
        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ message: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/translate",
      handler: async (ctx) => {
        const { text, target_lang } = ctx.body as { text: string; target_lang: string };

        if (!text || !target_lang) {
          return new Response(
            JSON.stringify({ error: "text and target_lang required" }),
            { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const outcome = await dispatchAiCompletion(
          {
            feature: "orbit-router.translate",
            messages: [
              { role: "system", content: `Translate the following text to ${target_lang}. Only return the translation.` },
              { role: "user", content: text },
            ],
            maxTokens: 1000,
            temperature: 0.3,
            purpose: "general",
          },
          { feature: "orbit-router.translate" },
        );

        if (outcome.status !== "succeeded" || !outcome.output) {
          console.error(
            "[orbit-router.translate] dispatch outcome:",
            outcome.status,
            outcome.errorCode,
            outcome.errorMessage ?? outcome.blockedReason,
          );
          return new Response(JSON.stringify({ error: "Translation failed" }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const translated = outcome.output.text || text;

        const cacheHeaders = buildCacheHeaders("search");
        return new Response(JSON.stringify({ translated, source: text, target_lang }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
  ],
});

Deno.serve(router);
