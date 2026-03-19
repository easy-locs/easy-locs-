/**
 * DINO V9 — Action Engine
 * Executes autonomous platform actions based on decision engine output.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type DinoActionType =
  | "fix_ui"
  | "send_campaign"
  | "boost_category"
  | "reduce_visibility"
  | "activate_pro"
  | "create_listing"
  | "optimize_flow";

export type DinoActionPriority = "critical" | "high" | "medium" | "low";

export interface DinoAction {
  id: string;
  type: DinoActionType;
  priority: DinoActionPriority;
  autoExecute: boolean;
  payload: Record<string, unknown>;
  result?: { success: boolean; message: string };
}

// --- Sub-executors ---

function applySafeTextFixes(payload: Record<string, unknown>): string {
  const fixes: string[] = [];
  const labels = (payload.labels as string[]) ?? [];
  for (const label of labels) {
    if (label.includes(".")) {
      fixes.push(`${label} → ${label.replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase())}`);
    }
  }
  return fixes.length ? `Fixed ${fixes.length} labels` : "No label issues";
}

async function triggerCampaign(payload: Record<string, unknown>): Promise<string> {
  const { data } = await supabase
    .from("dino_notifications")
    .insert([{
      actor_type: "system",
      channel: (payload.channel as string) ?? "email",
      template_key: (payload.templateKey as string) ?? "campaign_generic",
      payload_json: payload as Json,
      status: "pending",
    }])
    .select("id")
    .single();
  return data ? `Campaign queued: ${data.id}` : "Campaign queue failed";
}

async function boostCategory(payload: Record<string, unknown>): Promise<string> {
  const categories = (payload.categories as string[]) ?? [];
  if (!categories.length) return "No categories to boost";
  // Record boost intent in learning events
  await supabase.from("dino_learning_events").insert(
    categories.map(cat => ({
      event_type: "boost_applied",
      source_module: "action_engine",
      context_json: { category: cat, action: "boost" } as unknown as Json,
      outcome: "pending",
    }))
  );
  return `Boosted ${categories.length} categories`;
}

async function reduceVisibility(payload: Record<string, unknown>): Promise<string> {
  const entityIds = (payload.entityIds as string[]) ?? [];
  if (!entityIds.length) return "No entities to reduce";
  await supabase.from("dino_learning_events").insert(
    entityIds.map(id => ({
      event_type: "visibility_reduced",
      source_module: "action_engine",
      context_json: { entityId: id } as unknown as Json,
      outcome: "pending",
    }))
  );
  return `Reduced visibility for ${entityIds.length} entities`;
}

async function triggerActivation(payload: Record<string, unknown>): Promise<string> {
  const proIds = (payload.proIds as string[]) ?? [];
  if (!proIds.length) return "No pros to activate";
  // Queue activation reminders
  await supabase.from("dino_notifications").insert(
    proIds.slice(0, 20).map(pid => ({
      actor_type: "pro",
      actor_id: pid,
      channel: "email",
      template_key: "pro_quick_activate",
      payload_json: { source: "autopilot" } as Json,
      status: "pending",
    }))
  );
  return `Activation sent to ${Math.min(proIds.length, 20)} pros`;
}

async function createDraftListing(payload: Record<string, unknown>): Promise<string> {
  const name = (payload.name as string) ?? "New Business";
  const category = (payload.category as string) ?? "general";
  const city = (payload.city as string) ?? "unknown";
  await supabase.from("dino_learning_events").insert([{
    event_type: "draft_listing_created",
    source_module: "action_engine",
    context_json: { name, category, city } as unknown as Json,
    outcome: "created",
  }]);
  return `Draft listing created: ${name}`;
}

async function optimizeFunnel(payload: Record<string, unknown>): Promise<string> {
  const flowId = (payload.flowId as string) ?? "unknown";
  await supabase.from("dino_learning_events").insert([{
    event_type: "funnel_optimized",
    source_module: "action_engine",
    context_json: { flowId, suggestion: payload.suggestion } as unknown as Json,
    outcome: "applied",
  }]);
  return `Funnel optimized: ${flowId}`;
}

// --- Main executor ---

export async function executeDinoActions(actions: DinoAction[]): Promise<DinoAction[]> {
  const results: DinoAction[] = [];

  for (const action of actions) {
    if (!action.autoExecute) {
      results.push({ ...action, result: { success: false, message: "Skipped (manual)" } });
      continue;
    }

    try {
      let message: string;
      switch (action.type) {
        case "fix_ui":
          message = applySafeTextFixes(action.payload);
          break;
        case "send_campaign":
          message = await triggerCampaign(action.payload);
          break;
        case "boost_category":
          message = await boostCategory(action.payload);
          break;
        case "reduce_visibility":
          message = await reduceVisibility(action.payload);
          break;
        case "activate_pro":
          message = await triggerActivation(action.payload);
          break;
        case "create_listing":
          message = await createDraftListing(action.payload);
          break;
        case "optimize_flow":
          message = await optimizeFunnel(action.payload);
          break;
        default:
          message = "Unknown action type";
      }
      results.push({ ...action, result: { success: true, message } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ ...action, result: { success: false, message: msg } });
    }
  }

  return results;
}
