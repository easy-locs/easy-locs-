/**
 * Service Catalog Normalizer Engine — Processes service-vertical entities.
 * Handles service listings, pricing tiers, durations. NEVER uses food/hotel logic.
 * Only runs on vertical=services.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

interface ServiceItem {
  name: string;
  description?: string;
  price?: number;
  duration_minutes?: number;
  category?: string;
  image?: string;
}

interface ServiceCatalog {
  services: ServiceItem[];
  categories: string[];
  totalServices: number;
  hasPricing: boolean;
}

function extractServices(data: any): ServiceItem[] {
  if (!data) return [];
  const services: ServiceItem[] = [];
  
  // Handle various source formats
  const rawItems = data.services || data.items || data.menu_items || 
    (Array.isArray(data) ? data : data.sections?.flatMap((s: any) => s.items || []) || []);

  for (const item of Array.isArray(rawItems) ? rawItems : []) {
    const name = (item.name || item.service_name || item.title || "").trim();
    if (!name) continue;

    services.push({
      name,
      description: (item.description || "").trim() || undefined,
      price: parseFloat(item.price || item.rate) || undefined,
      duration_minutes: parseInt(item.duration || item.duration_minutes) || undefined,
      category: (item.category || item.service_type || "General").trim(),
      image: item.image || item.image_url || undefined,
    });
  }

  return services;
}

function buildServiceCatalog(services: ServiceItem[]): ServiceCatalog {
  const categories = [...new Set(services.map(s => s.category || "General"))];
  return {
    services,
    categories,
    totalServices: services.length,
    hasPricing: services.some(s => s.price != null && s.price > 0),
  };
}

export async function runServiceCatalogNormalizer(limit = 50) {
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, vertical, vertical_locked, service_catalog_at")
    .eq("vertical", "services")
    .is("service_catalog_at", null)
    .limit(limit);

  let normalized = 0, skipped = 0;

  for (const entity of entities ?? []) {
    const sourceData = entity.menu_items_json;
    if (!sourceData) { skipped++; continue; }

    // Preserve raw source before normalization
    await db.from("seed_merchants").update({
      raw_service_catalog_json: sourceData,
    }).eq("id", entity.id);

    const services = extractServices(sourceData);
    const catalog = buildServiceCatalog(services);

    await db.from("seed_merchants").update({
      service_catalog_json: catalog,
      service_catalog_at: new Date().toISOString(),
      pipeline_stage: "normalized_service",
      menu_quality_flag: services.length > 0 ? "service_catalog_ok" : "no_services_found",
    }).eq("id", entity.id);

    normalized++;
  }

  console.log(`[service-catalog-normalizer] normalized=${normalized} skipped=${skipped}`);
  return { normalized, skipped };
}
