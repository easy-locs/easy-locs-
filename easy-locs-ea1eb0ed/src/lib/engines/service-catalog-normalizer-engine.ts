import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface ServiceNormResult {
  shopId: string;
  shopName: string;
  issue: string;
  suggestedFix: string;
}

interface ServiceCatalogItem {
  name: string;
  price: number | null;
  price_range: string | null;
  duration: string | null;
  estimated_time: string | null;
  category: string | null;
}

function toServiceCatalogItems(raw: unknown): ServiceCatalogItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: r.name != null ? String(r.name) : "",
    price: r.price != null ? Number(r.price) : null,
    price_range: r.price_range != null ? String(r.price_range) : null,
    duration: r.duration != null ? String(r.duration) : null,
    estimated_time: r.estimated_time != null ? String(r.estimated_time) : null,
    category: r.category != null ? String(r.category) : null,
  }));
}

export async function runServiceCatalogNormalizer(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, service_catalog_json, vertical, pipeline_stage")
    .eq("vertical", "services")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], normalized: 0 };
  }

  const results: ServiceNormResult[] = [];
  let normalized = 0;

  for (const m of merchants) {
    const services = toServiceCatalogItems(m.service_catalog_json);

    if (services.length === 0) {
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "empty_catalog", suggestedFix: "Add at least one service" });
      normalized++;
      continue;
    }

    for (const svc of services) {
      if (!svc.name || svc.name.trim().length < 2) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_no_name", suggestedFix: "Add a service name" });
        normalized++;
        continue;
      }

      if (svc.name !== svc.name.trim() || /\s{2,}/.test(svc.name)) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_whitespace", suggestedFix: svc.name.trim().replace(/\s{2,}/g, " ") });
        normalized++;
      }

      if (svc.price == null && svc.price_range == null) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_no_price", suggestedFix: "Set a price or price range" });
        normalized++;
      }

      if (!svc.duration && !svc.estimated_time) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_no_duration", suggestedFix: "Add estimated duration" });
        normalized++;
      }

      if (!svc.category) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_no_category", suggestedFix: "Assign a service category" });
        normalized++;
      }
    }
  }

  if (normalized > 0) {
    platformBus.emit("SERVICE_CATALOG_NORMALIZED", { normalized, total: results.length }, "engine");
  }

  return { status: "completed", results, normalized };
}
