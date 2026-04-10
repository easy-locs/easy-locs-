import { db } from "@/services/db";

interface IntegrityIssue {
  entityId: string;
  entityName: string;
  field: string;
  issue: string;
  severity: "info" | "warning" | "critical";
}

export async function runEntityIntegrityCheck(orgId?: string) {
  let query = db
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, address, city, banner_url, logo_url, status, phone, email, description")
    .limit(300);

  if (orgId) query = query.eq("org_id", orgId);
  const { data: entities } = await query;

  if (!entities || entities.length === 0) {
    return { status: "completed", results: [], checked: 0 };
  }

  const results: IntegrityIssue[] = [];

  for (const e of entities) {
    if (!e.slug) results.push({ entityId: e.id, entityName: e.name, field: "slug", issue: "Missing slug", severity: "critical" });
    if (!e.vertical) results.push({ entityId: e.id, entityName: e.name, field: "vertical", issue: "No vertical assigned", severity: "warning" });
    if (!e.city) results.push({ entityId: e.id, entityName: e.name, field: "city", issue: "Missing city", severity: "warning" });
    if (!e.banner_url && !e.logo_url) results.push({ entityId: e.id, entityName: e.name, field: "media", issue: "No visual assets", severity: "warning" });
    if (e.status === "published" && (!e.description || e.description.length < 10)) {
      results.push({ entityId: e.id, entityName: e.name, field: "description", issue: "Published with insufficient description", severity: "info" });
    }
    if (e.name && /test|demo|xxx|placeholder/i.test(e.name)) {
      results.push({ entityId: e.id, entityName: e.name, field: "name", issue: "Name looks like test data", severity: "warning" });
    }
  }

  return { status: "completed", results, checked: entities.length };
}
