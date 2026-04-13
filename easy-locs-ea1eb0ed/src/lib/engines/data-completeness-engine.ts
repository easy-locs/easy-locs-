import { db } from "@/services/db";

interface CompletenessResult {
  shopId: string;
  shopName: string;
  completeness: number;
  missingFields: string[];
  grade: string;
}

interface MerchantCompletenessRow {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  description: string | null;
  vertical: string | null;
  menu_items_json: unknown[] | null;
  service_catalog_json: unknown[] | null;
}

const REQUIRED_FIELDS_BY_VERTICAL: Record<string, string[]> = {
  food: ["name", "address", "phone", "cover_image_url", "menu_items_json", "vertical", "description"],
  grocery: ["name", "address", "phone", "cover_image_url", "menu_items_json", "vertical"],
  services: ["name", "address", "phone", "cover_image_url", "service_catalog_json", "vertical", "description"],
  hotel: ["name", "address", "phone", "cover_image_url", "vertical", "description"],
  property: ["name", "address", "phone", "cover_image_url", "vertical"],
  default: ["name", "address", "phone", "cover_image_url", "vertical"],
};

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export async function runDataCompleteness(batchSize = 100) {
  return runDataCompletenessEngine(batchSize);
}

export async function runDataCompletenessEngine(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, address, phone, website, cover_image_url, logo_url, description, vertical, menu_items_json, service_catalog_json")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], scanned: 0 };
  }

  const results: CompletenessResult[] = [];

  for (const row of merchants) {
    const m = row as unknown as MerchantCompletenessRow;
    const v = m.vertical ?? "default";
    const required = REQUIRED_FIELDS_BY_VERTICAL[v] ?? REQUIRED_FIELDS_BY_VERTICAL.default;
    const missing: string[] = [];

    const fieldMap: Record<string, unknown> = {
      name: m.name,
      address: m.address,
      phone: m.phone,
      website: m.website,
      cover_image_url: m.cover_image_url,
      logo_url: m.logo_url,
      description: m.description,
      vertical: m.vertical,
      menu_items_json: m.menu_items_json,
      service_catalog_json: m.service_catalog_json,
    };

    for (const field of required) {
      const val = fieldMap[field];
      if (val === null || val === undefined || val === "") {
        missing.push(field);
      } else if (Array.isArray(val) && val.length === 0) {
        missing.push(field);
      }
    }

    const completeness = required.length > 0 ? Math.round(((required.length - missing.length) / required.length) * 100) : 100;

    results.push({
      shopId: m.id,
      shopName: m.name ?? "",
      completeness,
      missingFields: missing,
      grade: gradeFromScore(completeness),
    });
  }

  return { status: "completed", results, scanned: results.length };
}
