import { db } from "@/services/db";

interface IntakeResult {
  entityId: string;
  entityName: string;
  source: string;
  status: "imported" | "skipped" | "error";
  reason?: string;
}

export async function runSourceIntakeScan(orgId?: string) {
  let query = db
    .from("storefront_pages")
    .select("id, name, slug, source_type, source_url, source_contact_name, source_contact_phone, created_at, status")
    .order("created_at", { ascending: false })
    .limit(200);

  if (orgId) query = query.eq("org_id", orgId);
  const { data: entities } = await query;

  if (!entities || entities.length === 0) {
    return { status: "completed", results: [], snapshotted: 0 };
  }

  const results: IntakeResult[] = [];
  let snapshotted = 0;

  for (const entity of entities) {
    const source = entity.source_type || "manual";
    if (entity.status === "published" && entity.name) {
      results.push({ entityId: entity.id, entityName: entity.name, source, status: "imported" });
      snapshotted++;
    } else if (!entity.name || entity.name.length < 2) {
      results.push({ entityId: entity.id, entityName: entity.name || "(empty)", source, status: "skipped", reason: "Invalid name" });
    } else {
      results.push({ entityId: entity.id, entityName: entity.name, source, status: "imported" });
      snapshotted++;
    }
  }

  return { status: "completed", results, snapshotted };
}
