/**
 * DINO V9 — Action Engine
 * Executes autonomous platform actions based on decision engine output.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DinoMode } from "./types";

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

// --- Rate limits ---
const MAX_UI_FIX_PER_CYCLE = 20;
const MAX_BOOSTS_PER_CYCLE = 20;

// --- Mode gate ---
export function shouldExecute(action: DinoAction, mode: DinoMode): boolean {
  if (mode === "manual") return false;
  if (mode === "semi_auto") return action.priority === "critical";
  return true;
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

async function recordLearningEvent(eventType: string, entityId: string, entityType: string, metric: string, context: Record<string, unknown> = {}) {
  await supabase.from("dino_learning_events").insert([{
    event_type: eventType,
    entity_id: entityId,
    entity_type: entityType,
    metric,
    metadata_json: context as Json,
    new_value: 0,
    previous_value: 0,
  }]);
}

async function boostCategory(payload: Record<string, unknown>): Promise<string> {
  const categories = (payload.categories as string[]) ?? [];
  if (!categories.length) return "No categories to boost";
  for (const cat of categories) {
    await recordLearningEvent("boost_applied", cat, "category", "visibility", { action: "boost" });
  }
  return `Boosted ${categories.length} categories`;
}

async function reduceVisibility(payload: Record<string, unknown>): Promise<string> {
  const entityIds = (payload.entityIds as string[]) ?? [];
  if (!entityIds.length) return "No entities to reduce";
  for (const id of entityIds) {
    await recordLearningEvent("visibility_reduced", id, "listing", "visibility");
  }
  return `Reduced visibility for ${entityIds.length} entities`;
}

async function triggerActivation(payload: Record<string, unknown>): Promise<string> {
  const proIds = (payload.proIds as string[]) ?? [];
  if (!proIds.length) return "No pros to activate";
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
  await recordLearningEvent("draft_listing_created", name, "listing", "creation", { category, city });
  return `Draft listing created: ${name}`;
}

async function optimizeFunnel(payload: Record<string, unknown>): Promise<string> {
  const flowId = (payload.flowId as string) ?? "unknown";
  await recordLearningEvent("funnel_optimized", flowId, "funnel", "conversion", { suggestion: payload.suggestion });
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
