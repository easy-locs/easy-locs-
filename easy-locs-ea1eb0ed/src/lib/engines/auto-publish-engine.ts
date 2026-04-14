import { db } from "@/services/db";

interface PublishResult {
  shopId: string;
  shopName: string;
  action: "published" | "blocked" | "persist_failed";
  reason: string;
}

export async function runAutoPublish(batchSize = 100) {
  const { data: candidates } = await db
    .from("seed_merchants")
    .select("id, name, vertical, visibility_mode, gate_status, pipeline_stage, cover_image_url, logo_url, description, phone, address, menu_items_json, service_catalog_json")
    .in("visibility_mode", ["hidden", "draft"])
    .eq("gate_status", "passed")
    .eq("pipeline_stage", "moderation_passed")
    .limit(batchSize);

  if (!candidates || candidates.length === 0) {
    return { status: "completed", results: [], published: 0, blocked: 0 };
  }

  const results: PublishResult[] = [];
  let published = 0;
  let blocked = 0;

  for (const m of candidates) {
    const issues: string[] = [];

    if (!m.name || m.name.trim().length < 2) issues.push("missing_name");
    if (!m.address) issues.push("missing_address");
    if (!m.cover_image_url && !m.logo_url) issues.push("no_visuals");

    const v = m.vertical ?? "unknown";
    if (v === "food" && (!m.menu_items_json || (Array.isArray(m.menu_items_json) && m.menu_items_json.length === 0))) {
      issues.push("empty_menu");
    }
    if (v === "services" && (!m.service_catalog_json || (Array.isArray(m.service_catalog_json) && m.service_catalog_json.length === 0))) {
      issues.push("empty_catalog");
    }

    if (issues.length > 0) {
      results.push({ shopId: m.id, shopName: m.name ?? "", action: "blocked", reason: issues.join(", ") });
      blocked++;
      continue;
    }

    try {
      const { error } = await db
        .from("seed_merchants")
        .update({ visibility_mode: "search_only" })
        .eq("id", m.id);

      if (error) {
        results.push({ shopId: m.id, shopName: m.name, action: "persist_failed", reason: `db_error: ${error.message}` });
        continue;
      }

      results.push({ shopId: m.id, shopName: m.name, action: "published", reason: "gate_passed_complete" });
      published++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown_error";
      results.push({ shopId: m.id, shopName: m.name, action: "persist_failed", reason: message });
    }
  }

  return { status: "completed", results, published, blocked };
}
