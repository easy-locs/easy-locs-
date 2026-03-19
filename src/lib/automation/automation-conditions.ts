/**
 * Automation Conditions Engine
 * Evaluates step conditions against entity state to determine if a step should execute.
 */
import { supabase } from "@/integrations/supabase/client";

export type ConditionKey =
  | "not_claimed" | "profile_incomplete" | "menu_missing" | "not_activated"
  | "no_accept" | "still_failed" | "still_inactive" | "review_required"
  | "settlement_pending" | "no_driver_found" | "low_conversion" | "low_coverage"
  | "inactive_since_threshold";

interface ConditionContext {
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function evaluateCondition(condition: string | undefined, ctx: ConditionContext): Promise<boolean> {
  if (!condition) return true; // no condition = always execute

  switch (condition) {
    case "not_claimed": {
      const { data } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("status")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data?.status === "imported_not_claimed" || data?.status === "coming_soon";
    }

    case "profile_incomplete": {
      const { data } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("business_name, business_phone, business_email")
        .eq("id", ctx.entityId)
        .maybeSingle();
      if (!data) return true;
      return !data.business_name || !data.business_phone;
    }

    case "menu_missing": {
      const { count } = await (supabase as any)
        .from("catalog_items")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", ctx.entityId);
      return (count ?? 0) === 0;
    }

    case "not_activated": {
      const { data } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("status")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data?.status !== "live" && data?.status !== "active";
    }

    case "no_accept": {
      const { data } = await (supabase as any)
        .from("dispatch_jobs_v2")
        .select("dispatch_status")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data?.dispatch_status === "broadcasted" || data?.dispatch_status === "offered" || data?.dispatch_status === "open";
    }

    case "still_failed": {
      if (ctx.entityType === "order") {
        const { data } = await (supabase as any)
          .from("orders")
          .select("payment_status")
          .eq("id", ctx.entityId)
          .maybeSingle();
        return data?.payment_status !== "settled" && data?.payment_status !== "captured";
      }
      return true;
    }

    case "still_inactive": {
      const { data } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("status")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data?.status !== "live" && data?.status !== "active";
    }

    case "review_required": {
      const { data } = await (supabase as any)
        .from("orders")
        .select("payment_status")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data?.payment_status === "review_required";
    }

    case "settlement_pending": {
      const { data } = await (supabase as any)
        .from("orders")
        .select("payment_status")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data?.payment_status === "captured" || data?.payment_status === "authorized";
    }

    case "no_driver_found": {
      const { data } = await (supabase as any)
        .from("dispatch_jobs_v2")
        .select("dispatch_status, assigned_driver_id")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return !data?.assigned_driver_id && data?.dispatch_status !== "cancelled";
    }

    case "low_conversion":
    case "low_coverage":
      // These are scored conditions — always true to execute scoring actions
      return true;

    case "inactive_since_threshold": {
      const threshold = (ctx.metadata as any)?.inactiveThresholdDays ?? 30;
      const cutoff = new Date(Date.now() - threshold * 86400_000).toISOString();
      const { data } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("updated_at")
        .eq("id", ctx.entityId)
        .maybeSingle();
      return data ? data.updated_at < cutoff : true;
    }

    default:
      // Custom metadata flag check
      if (ctx.metadata && condition in ctx.metadata) {
        return !!ctx.metadata[condition];
      }
      console.warn(`[conditions] Unknown condition: ${condition}`);
      return true;
  }
}
