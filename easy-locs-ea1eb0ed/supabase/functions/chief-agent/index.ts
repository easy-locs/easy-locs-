import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { dispatchAiCompletion } from "../_shared/execution/ai-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ChiefAgentRequest {
  command: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  actionType?: string;
  actionPayload?: Record<string, unknown>;
  correlationId?: string;
}

interface ChiefAgentResponse {
  understood: string;
  agentsUsed: string[];
  actionsTaken: string[];
  findings: Array<{ text: string; severity: "green" | "yellow" | "red" }>;
  recommendations: string[];
  status: "completed" | "partial" | "failed";
  nextSteps: Array<{ label: string; action: string; payload?: Record<string, unknown> }>;
  followUpSuggestions?: string[];
  detailedLog: string[];
  correlationId: string;
}

interface DispatchResult {
  agent: string;
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
}

const CHIEF_AGENT_SYSTEM_PROMPT = `You are the Chief Agent — a unified command center AI for a super-app platform that manages rides, deliveries, marketplace, property, wallet, support, and more.

Your role:
- Interpret natural language commands from the super-admin
- Determine which specialized agents/systems need to be dispatched
- Synthesize real execution results from dispatched agents into business-language responses

Available backend agents you can dispatch (return these in "dispatchTargets"):
- "sentinel": Platform health checks (engine heartbeat, conflict scan, integrity scans, security scan, wallet integrity, delivery integrity). Use when admin asks about system health, status, problems, or checks.
- "command-center": Engine status, approve repairs, quarantine/release engines, view event history, view agents. Use when admin asks about engines, repairs, or system control actions.
- "health-check": External integration health (plaid, livekit, meilisearch, news APIs). Use when admin asks about third-party service status.
- "qa-engine": Runtime QA checks (orbit, wallet, dashboard, delivery modules). Use when admin asks about quality, testing, module diagnostics, or runtime validation.
- "ai-assistant": General AI analysis, summarization, or content tasks. Use when admin asks for analysis, summaries, translations, or content generation.

You MUST respond with valid JSON matching this exact structure:
{
  "understood": "Brief summary of what you understood the admin wants",
  "dispatchTargets": ["sentinel", "command-center", "health-check", "qa-engine", "ai-assistant"],
  "agentsUsed": ["List of agent/system names involved"],
  "actionsTaken": ["List of actions performed"],
  "findings": [{"text": "Finding description", "severity": "green|yellow|red"}],
  "recommendations": ["Actionable recommendations in plain language"],
  "status": "completed|partial|failed",
  "nextSteps": [{"label": "Button label", "action": "action_type", "payload": {}}],
  "followUpSuggestions": ["Suggested follow-up questions as quick-reply options"]
}

Rules:
- Use plain business language, never developer jargon
- Severity: green = healthy/good, yellow = needs attention, red = urgent/critical
- nextSteps actions can be: "run_check", "retry", "fix_now", "show_details", "notify", "escalate"
- Always include at least one follow-up suggestion
- Be concise but thorough
- Reference previous conversation context when relevant
- Include relevant dispatchTargets based on the command — if unsure, include "sentinel" for general health queries
- If the command is conversational or doesn't need real data, use an empty dispatchTargets array`;

async function requireSuperAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ authorized: boolean; response?: Response }> {
  if (userId === "service_role") return { authorized: true };

  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });

  if (!data) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: "Super admin privileges required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }

  return { authorized: true };
}

function generateCorrelationId(): string {
  return `chief_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function dispatchToSentinel(
  supabaseUrl: string,
  serviceRoleKey: string,
  jobs?: string[],
): Promise<DispatchResult> {
  try {
    const body: Record<string, unknown> = { _from_queue: true };
    if (jobs && jobs.length > 0) body.jobs = jobs;

    const res = await fetch(`${supabaseUrl}/functions/v1/sentinel-server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { agent: "sentinel", success: false, data: {}, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { agent: "sentinel", success: true, data };
  } catch (err) {
    return { agent: "sentinel", success: false, data: {}, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function dispatchToCommandCenter(
  supabaseUrl: string,
  serviceRoleKey: string,
  action: string = "status",
  payload: Record<string, unknown> = {},
): Promise<DispatchResult> {
  try {
    const pathSuffix = action !== "status" ? `/${action}` : "";
    const res = await fetch(`${supabaseUrl}/functions/v1/command-center-api${pathSuffix}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { agent: "command-center", success: false, data: {}, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { agent: "command-center", success: true, data };
  } catch (err) {
    return { agent: "command-center", success: false, data: {}, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function dispatchToHealthCheck(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<DispatchResult> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/health-check`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!res.ok) {
      return { agent: "health-check", success: false, data: {}, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { agent: "health-check", success: true, data };
  } catch (err) {
    return { agent: "health-check", success: false, data: {}, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function dispatchToQaEngine(
  supabaseUrl: string,
  serviceRoleKey: string,
  scope?: string,
): Promise<DispatchResult> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/master-runtime-qa-engine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ scope: scope || "full", dryRun: true }),
    });

    if (!res.ok) {
      return { agent: "qa-engine", success: false, data: {}, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { agent: "qa-engine", success: true, data };
  } catch (err) {
    return { agent: "qa-engine", success: false, data: {}, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function dispatchToAiAssistant(
  supabaseUrl: string,
  serviceRoleKey: string,
  task: string,
  context: string,
): Promise<DispatchResult> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        message: context,
        task: task || "summarize",
        locale: "en",
      }),
    });

    if (!res.ok) {
      return { agent: "ai-assistant", success: false, data: {}, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { agent: "ai-assistant", success: true, data };
  } catch (err) {
    return { agent: "ai-assistant", success: false, data: {}, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function dispatchAgents(
  targets: string[],
  supabaseUrl: string,
  serviceRoleKey: string,
  command: string,
  actionPayload?: Record<string, unknown>,
): Promise<DispatchResult[]> {
  const dispatches: Promise<DispatchResult>[] = [];

  for (const target of targets) {
    switch (target) {
      case "sentinel":
        dispatches.push(
          dispatchToSentinel(supabaseUrl, serviceRoleKey, actionPayload?.jobs as string[] | undefined),
        );
        break;
      case "command-center": {
        const ccAction = (actionPayload?.action as string) || "status";
        const { action: _action, ...ccPayload } = actionPayload ?? {};
        dispatches.push(
          dispatchToCommandCenter(supabaseUrl, serviceRoleKey, ccAction, ccPayload),
        );
      }
        break;
      case "health-check":
        dispatches.push(dispatchToHealthCheck(supabaseUrl, serviceRoleKey));
        break;
      case "qa-engine":
        dispatches.push(
          dispatchToQaEngine(supabaseUrl, serviceRoleKey, actionPayload?.scope as string | undefined),
        );
        break;
      case "ai-assistant":
        dispatches.push(
          dispatchToAiAssistant(
            supabaseUrl,
            serviceRoleKey,
            (actionPayload?.task as string) || "summarize",
            command,
          ),
        );
        break;
    }
  }

  return Promise.all(dispatches);
}

async function logCommand(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  command: string,
  intent: string,
  agentsUsed: string[],
  resultSummary: Record<string, unknown>,
  detailedLog: string[],
  correlationId: string,
) {
  try {
    await supabase.from("agent_command_history").insert({
      user_id: userId,
      command_text: command,
      interpreted_intent: intent,
      agents_used: agentsUsed,
      result_summary: resultSummary,
      detailed_log: detailedLog,
      correlation_id: correlationId,
    });
  } catch (err) {
    console.error("[chief-agent] Failed to log command:", err);
  }
}

async function logTelemetry(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  correlationId: string,
  data: Record<string, unknown>,
) {
  try {
    await supabase.from("sentinel_telemetry").insert({
      event_type: eventType,
      source: "chief-agent",
      correlation_id: correlationId,
      data,
    }).catch(() => {});
  } catch {}
}

async function fetchRecentHistory(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit = 5,
): Promise<Array<{ command_text: string; interpreted_intent: string; result_summary: Record<string, unknown> }>> {
  try {
    const { data } = await supabase
      .from("agent_command_history")
      .select("command_text, interpreted_intent, result_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req);
  if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const adminCheck = await requireSuperAdmin(supabase, auth.userId!);
  if (!adminCheck.authorized) return adminCheck.response!;

  try {
    const body: ChiefAgentRequest = await req.json();
    const { command, conversationHistory = [], actionType, actionPayload } = body;

    if (!command && !actionType) {
      return new Response(
        JSON.stringify({ error: "Command or actionType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const correlationId = body.correlationId || generateCorrelationId();
    const detailedLog: string[] = [];
    detailedLog.push(`[${new Date().toISOString()}] Command received: ${command || actionType}`);
    detailedLog.push(`[${new Date().toISOString()}] Correlation ID: ${correlationId}`);

    await logTelemetry(supabase, "chief_agent:command_received", correlationId, {
      command: command || actionType,
      user_id: auth.userId,
    });

    const ACTION_TO_DISPATCH: Record<string, { targets: string[]; payload: Record<string, unknown> }> = {
      run_check: { targets: ["sentinel", "health-check"], payload: {} },
      retry: { targets: ["sentinel"], payload: {} },
      fix_now: { targets: ["command-center"], payload: { action: "approve-repair" } },
      show_details: { targets: ["command-center"], payload: { action: "status" } },
      notify: { targets: ["command-center"], payload: { action: "events" } },
      escalate: { targets: ["sentinel", "command-center", "qa-engine"], payload: {} },
    };

    let dispatchTargets: string[];
    let aiParsed: Record<string, unknown>;

    let effectivePayload = actionPayload;

    if (actionType && ACTION_TO_DISPATCH[actionType]) {
      const mapping = ACTION_TO_DISPATCH[actionType];
      dispatchTargets = mapping.targets;
      effectivePayload = { ...mapping.payload, ...actionPayload };
      aiParsed = {
        understood: `Executing ${actionType}: ${command}`,
        dispatchTargets,
        agentsUsed: dispatchTargets,
        actionsTaken: [`Deterministic dispatch: ${actionType}`],
        recommendations: [],
      };
      detailedLog.push(`[${new Date().toISOString()}] Deterministic action dispatch: ${actionType} -> ${dispatchTargets.join(", ")}`);
    } else {
      const recentHistory = await fetchRecentHistory(supabase, auth.userId!);
      detailedLog.push(`[${new Date().toISOString()}] Loaded ${recentHistory.length} recent commands for context`);

      const historyContext = recentHistory.length > 0
        ? `\n\nRecent command history for context:\n${recentHistory.map((h, i) => `${i + 1}. Command: "${h.command_text}" → Intent: "${h.interpreted_intent}"`).join("\n")}`
        : "";

      const messages = [
        { role: "system", content: CHIEF_AGENT_SYSTEM_PROMPT + historyContext },
        ...conversationHistory.slice(-10),
        { role: "user", content: command || `Execute action: ${actionType}` },
      ];

      detailedLog.push(`[${new Date().toISOString()}] Calling AI router for intent interpretation and dispatch planning...`);

      // LB1 Cleanup #842: migrated from aiRouteAndParse() to
      // dispatchAiCompletion() so the call passes through the registered
      // ai.completion agent (policy + audit + agent quota).
      const planOutcome = await dispatchAiCompletion(
        {
          feature: "chief-agent.plan",
          messages: messages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
          temperature: 0.3,
          maxTokens: 2000,
          responseFormat: "json",
          purpose: "general",
        },
        { feature: "chief-agent.plan", correlationId },
      );

      if (planOutcome.status !== "succeeded" || !planOutcome.output) {
        detailedLog.push(`[${new Date().toISOString()}] AI dispatch ${planOutcome.status} (${planOutcome.errorCode ?? "n/a"}); proceeding with empty plan`);
        aiParsed = { understood: command || `action:${actionType}`, dispatchTargets: [] };
      } else {
        const content = planOutcome.output.text;
        const interaction = planOutcome.output.interaction;
        detailedLog.push(`[${new Date().toISOString()}] AI provider: ${interaction.provider}${interaction.fallbackUsed ? " (fallback)" : ""}`);

        try {
          aiParsed = (planOutcome.output.json as Record<string, unknown>) ?? JSON.parse(content);
        } catch {
          aiParsed = { understood: content, dispatchTargets: [], findings: [{ text: content, severity: "yellow" }] };
        }
      }

      dispatchTargets = Array.isArray(aiParsed.dispatchTargets) ? aiParsed.dispatchTargets as string[] : [];
    }

    let dispatchResults: DispatchResult[] = [];
    if (dispatchTargets.length > 0) {
      detailedLog.push(`[${new Date().toISOString()}] Dispatching to agents: ${dispatchTargets.join(", ")}`);

      await logTelemetry(supabase, "chief_agent:dispatch_started", correlationId, {
        targets: dispatchTargets,
      });

      dispatchResults = await dispatchAgents(
        dispatchTargets,
        supabaseUrl,
        supabaseKey,
        command || `action:${actionType}`,
        effectivePayload,
      );

      for (const result of dispatchResults) {
        if (result.success) {
          detailedLog.push(`[${new Date().toISOString()}] ✓ ${result.agent}: dispatched successfully`);
        } else {
          detailedLog.push(`[${new Date().toISOString()}] ✗ ${result.agent}: ${result.error}`);
        }
      }

      await logTelemetry(supabase, "chief_agent:dispatch_completed", correlationId, {
        targets: dispatchTargets,
        results: dispatchResults.map((r) => ({ agent: r.agent, success: r.success, error: r.error })),
      });
    } else {
      detailedLog.push(`[${new Date().toISOString()}] No backend agents needed for this command`);
    }

    const agentDataSummary = dispatchResults.length > 0
      ? `\n\nReal agent execution results:\n${dispatchResults.map((r) => `- ${r.agent}: ${r.success ? "SUCCESS" : "FAILED"} — ${JSON.stringify(r.data).slice(0, 500)}`).join("\n")}`
      : "";

    let parsed: ChiefAgentResponse;

    if (dispatchResults.length > 0) {
      detailedLog.push(`[${new Date().toISOString()}] Re-interpreting results with AI for business-language summary...`);

      const synthMessages = [
        { role: "system", content: CHIEF_AGENT_SYSTEM_PROMPT },
        { role: "user", content: command || `Execute action: ${actionType}` },
        {
          role: "assistant",
          content: `I dispatched the following agents and got results. Let me synthesize:${agentDataSummary}`,
        },
        {
          role: "user",
          content: "Now provide the final structured JSON response incorporating those real results. Use the actual data, do NOT make up numbers. Summarize clearly in business language.",
        },
      ];

      try {
        const synthOutcome = await dispatchAiCompletion(
          {
            feature: "chief-agent.synthesize",
            messages: synthMessages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
            temperature: 0.2,
            maxTokens: 2000,
            responseFormat: "json",
            purpose: "general",
          },
          { feature: "chief-agent.synthesize", correlationId },
        );

        if (synthOutcome.status !== "succeeded" || !synthOutcome.output) {
          throw new Error(`AI dispatch ${synthOutcome.status}: ${synthOutcome.errorCode ?? "unknown"}`);
        }

        const raw = (synthOutcome.output.json as Record<string, unknown>) ?? JSON.parse(synthOutcome.output.text);
        parsed = {
          understood: raw.understood || aiParsed.understood || "Processed your request",
          agentsUsed: dispatchResults.map((r) => r.agent),
          actionsTaken: Array.isArray(raw.actionsTaken)
            ? raw.actionsTaken
            : dispatchResults.filter((r) => r.success).map((r) => `Dispatched ${r.agent}`),
          findings: Array.isArray(raw.findings)
            ? raw.findings.map((f: Record<string, unknown>) => ({
                text: (f.text as string) || String(f),
                severity: (["green", "yellow", "red"].includes(f.severity as string) ? f.severity : "yellow") as "green" | "yellow" | "red",
              }))
            : [],
          recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
          status: ["completed", "partial", "failed"].includes(raw.status as string) ? raw.status as "completed" | "partial" | "failed" : "completed",
          nextSteps: Array.isArray(raw.nextSteps)
            ? raw.nextSteps.map((s: Record<string, unknown>) => ({
                label: (s.label as string) || "Action",
                action: (s.action as string) || "run_check",
                payload: (s.payload as Record<string, unknown>) || {},
              }))
            : [],
          followUpSuggestions: Array.isArray(raw.followUpSuggestions) ? raw.followUpSuggestions : [],
          detailedLog,
          correlationId,
        };
      } catch {
        detailedLog.push(`[${new Date().toISOString()}] Synthesis parse failed, using raw dispatch results`);
        parsed = buildResponseFromDispatchResults(
          aiParsed,
          dispatchResults,
          detailedLog,
          correlationId,
        );
      }
    } else {
      parsed = {
        understood: (aiParsed.understood as string) || "Could not interpret the command",
        agentsUsed: Array.isArray(aiParsed.agentsUsed) ? aiParsed.agentsUsed as string[] : ["Chief Agent"],
        actionsTaken: Array.isArray(aiParsed.actionsTaken) ? aiParsed.actionsTaken as string[] : [],
        findings: Array.isArray(aiParsed.findings)
          ? (aiParsed.findings as Array<Record<string, unknown>>).map((f) => ({
              text: (f.text as string) || String(f),
              severity: (["green", "yellow", "red"].includes(f.severity as string) ? f.severity : "yellow") as "green" | "yellow" | "red",
            }))
          : [],
        recommendations: Array.isArray(aiParsed.recommendations) ? aiParsed.recommendations as string[] : [],
        status: (["completed", "partial", "failed"].includes(aiParsed.status as string) ? aiParsed.status : "completed") as "completed" | "partial" | "failed",
        nextSteps: Array.isArray(aiParsed.nextSteps)
          ? (aiParsed.nextSteps as Array<Record<string, unknown>>).map((s) => ({
              label: (s.label as string) || "Action",
              action: (s.action as string) || "run_check",
              payload: (s.payload as Record<string, unknown>) || {},
            }))
          : [],
        followUpSuggestions: Array.isArray(aiParsed.followUpSuggestions) ? aiParsed.followUpSuggestions as string[] : [],
        detailedLog,
        correlationId,
      };
    }

    detailedLog.push(`[${new Date().toISOString()}] Response generated successfully`);

    await logCommand(
      supabase,
      auth.userId!,
      command || `action:${actionType}`,
      parsed.understood,
      parsed.agentsUsed,
      {
        status: parsed.status,
        findingsCount: parsed.findings.length,
        actionsCount: parsed.actionsTaken.length,
        dispatched: dispatchTargets,
        dispatchResults: dispatchResults.map((r) => ({ agent: r.agent, success: r.success })),
      },
      detailedLog,
      correlationId,
    );

    await logTelemetry(supabase, "chief_agent:command_completed", correlationId, {
      status: parsed.status,
      agents_used: parsed.agentsUsed,
      findings_count: parsed.findings.length,
    });

    detailedLog.push(`[${new Date().toISOString()}] Command logged to history`);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[chief-agent] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        correlationId: generateCorrelationId(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function buildResponseFromDispatchResults(
  aiParsed: Record<string, unknown>,
  results: DispatchResult[],
  detailedLog: string[],
  correlationId: string,
): ChiefAgentResponse {
  const findings: Array<{ text: string; severity: "green" | "yellow" | "red" }> = [];
  const actionsTaken: string[] = [];

  for (const r of results) {
    if (r.success) {
      actionsTaken.push(`Dispatched ${r.agent} successfully`);
      const data = r.data;
      if (r.agent === "sentinel" && typeof data.passed === "number") {
        const severity: "green" | "yellow" | "red" = (data.failed as number) > 0
          ? (data.incidents as number) > 0 ? "red" : "yellow"
          : "green";
        findings.push({
          text: `Sentinel: ${data.passed} checks passed, ${data.failed} failed, ${data.incidents} incidents`,
          severity,
        });
      } else {
        findings.push({ text: `${r.agent}: operation completed`, severity: "green" });
      }
    } else {
      findings.push({ text: `${r.agent}: ${r.error || "dispatch failed"}`, severity: "red" });
    }
  }

  return {
    understood: (aiParsed.understood as string) || "Processed your request",
    agentsUsed: results.map((r) => r.agent),
    actionsTaken,
    findings,
    recommendations: Array.isArray(aiParsed.recommendations) ? aiParsed.recommendations as string[] : [],
    status: results.every((r) => r.success) ? "completed" : "partial",
    nextSteps: [{ label: "Run check again", action: "run_check" }],
    followUpSuggestions: ["Show more details", "Check specific service"],
    detailedLog,
    correlationId,
  };
}
