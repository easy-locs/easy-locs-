import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// LB Closeout #852 — orbit-ai-support routes through the platform agent
// registry so support classification is governed (quota, sensitive routing,
// audit). Direct fetches against the OpenAI HTTP API are no longer permitted
// on this surface; provider fallback (anthropic) is configured at the
// adapter / router level, not in the callsite.
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const SUPPORT_TAXONOMY = [
  "order_status", "delay", "missing_item", "wrong_item", "quality_complaint",
  "refund_request", "payment_issue", "delivery_issue", "suspicious_behavior",
  "fraud_suspicion", "shop_complaint", "technical_app_issue", "platform_escalation",
  "booking_issue", "property_issue", "driver_issue", "account_issue", "cancellation",
] as const;

const SYSTEM_PROMPT = `You are Easy-Locs AI Support — a premium, calm, professional support assistant for a global super-app covering food delivery, taxi, hotels, services, and marketplace.

RULES:
1. Identify yourself as "Easy-Locs Support" — never claim to be human.
2. Be concise, warm, and solution-oriented. No filler words.
3. Classify every issue into EXACTLY ONE of these categories: ${SUPPORT_TAXONOMY.join(", ")}
4. Extract context: order IDs, shop names, booking references, payment issues.
5. For simple queries (order status, account help, technical issues): answer directly.
6. For shop-related issues (missing items, delays, quality): recommend shop transfer.
7. For payment/fraud issues: flag for escalation.
8. Always respond in the user's language.
9. Never share internal system details, routing logic, or admin processes.
10. If unsure, ask ONE focused follow-up question — never more.

RESPONSE FORMAT (JSON):
{
  "message": "Your response to the user",
  "classification": {
    "category": "one of the taxonomy categories",
    "confidence": 0.0-1.0,
    "urgency": "low|medium|high|critical"
  },
  "context": {
    "order_id": null,
    "shop_id": null,
    "booking_id": null,
    "payment_id": null
  },
  "action": {
    "type": "respond|transfer_to_shop|create_ticket|escalate|ask_followup",
    "reason": "brief explanation"
  }
}`;

interface RequestBody {
  session_id: string;
  message: string;
  language?: string;
  context?: {
    order_id?: string;
    shop_id?: string;
    booking_id?: string;
  };
  conversation_history?: Array<{
    role: string;
    content: string;
  }>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { session_id, message, language = "en", context, conversation_history = [] } = body;

    if (!session_id || !message) {
      return new Response(
        JSON.stringify({ error: "session_id and message are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data: session } = await supabase.from("support_sessions")
      .select("user_id")
      .eq("id", session_id)
      .single();

    if (!session || session.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Session not found or access denied" }),
        { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("support_messages").insert({
      session_id,
      sender: "user",
      content: message,
      content_type: "text",
      metadata: { language },
    });

    await supabase.from("support_traces").insert({
      session_id,
      event_type: "user_message",
      actor: "user",
      data: { content_length: message.length, language },
    });

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...conversation_history.slice(-10).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: String(m.content ?? ""),
      })),
      {
        role: "user" as const,
        content: context
          ? `[Context: order=${context.order_id || "none"}, shop=${context.shop_id || "none"}, booking=${context.booking_id || "none"}, lang=${language}]\n\n${message}`
          : message,
      },
    ];

    const aiResponse = await callAI(messages);

    let parsed: {
      message: string;
      classification?: { category: string; confidence: number; urgency: string };
      context?: Record<string, string | null>;
      action?: { type: string; reason: string };
    };

    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = {
        message: aiResponse,
        classification: { category: "other", confidence: 0.3, urgency: "low" },
        action: { type: "respond", reason: "Could not parse structured response" },
      };
    }

    await supabase.from("support_messages").insert({
      session_id,
      sender: "ai",
      content: parsed.message,
      content_type: "text",
      metadata: {
        classification: parsed.classification,
        action: parsed.action,
        raw_context: parsed.context,
      },
    });

    if (parsed.classification) {
      await supabase.from("support_sessions").update({
        issue_category: parsed.classification.category,
        urgency: parsed.classification.urgency,
        ai_classification_confidence: parsed.classification.confidence,
        ai_summary: parsed.message.slice(0, 500),
        routing_target: mapActionToRouting(parsed.action?.type),
        status: "ai_handling",
        updated_at: new Date().toISOString(),
      }).eq("id", session_id);

      await supabase.from("support_traces").insert({
        session_id,
        event_type: "ai_classification",
        actor: "ai",
        data: {
          category: parsed.classification.category,
          confidence: parsed.classification.confidence,
          urgency: parsed.classification.urgency,
          action: parsed.action,
        },
      });
    }

    if (parsed.action?.type === "transfer_to_shop") {
      await supabase.from("support_traces").insert({
        session_id,
        event_type: "routing_decision",
        actor: "ai",
        data: {
          target: "shop_transfer",
          reason: parsed.action.reason,
        },
      });
    }

    if (parsed.action?.type === "escalate") {
      await supabase.from("support_traces").insert({
        session_id,
        event_type: "escalation_triggered",
        actor: "ai",
        data: {
          reason: parsed.action.reason,
          category: parsed.classification?.category,
        },
      });

      await supabase.from("support_sessions").update({
        status: "escalated_admin",
        escalation_reason: parsed.action.reason,
        updated_at: new Date().toISOString(),
      }).eq("id", session_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: parsed.message,
        classification: parsed.classification,
        action: parsed.action,
        session_id,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[orbit-ai-support] Error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "I'm having trouble processing your request. Please try again.",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});

function mapActionToRouting(
  actionType: string | undefined,
): string {
  switch (actionType) {
    case "transfer_to_shop": return "shop_transfer";
    case "escalate": return "admin_escalation";
    case "create_ticket": return "ticket_fallback";
    case "ask_followup":
    case "respond":
    default: return "ai_direct";
  }
}

async function callAI(
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>,
): Promise<string> {
  const outcome = await dispatchAiCompletion(
    {
      feature: "orbit-ai-support",
      messages,
      maxTokens: 1024,
      temperature: 0.3,
      responseFormat: "json",
      purpose: "general",
    },
    { feature: "orbit-ai-support" },
  );

  if (outcome.status === "succeeded" && outcome.output) {
    return outcome.output.text ?? "";
  }

  console.warn(
    "[orbit-ai-support] dispatch outcome:",
    outcome.status,
    outcome.errorCode,
    outcome.errorMessage ?? outcome.blockedReason,
  );

  return JSON.stringify({
    message: "I apologize, but I'm unable to process your request right now. A support ticket has been created for you.",
    classification: { category: "technical_app_issue", confidence: 0.1, urgency: "medium" },
    action: { type: "create_ticket", reason: "AI service unavailable" },
  });
}
