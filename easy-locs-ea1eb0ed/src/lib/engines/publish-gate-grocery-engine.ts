import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface CatalogItem {
  name: string;
  price: number | null;
}

interface GateResult {
  shopId: string;
  shopName: string;
  passed: boolean;
  failures: string[];
  persisted: boolean;
}

function toCatalogItems(raw: unknown): CatalogItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    price: r.price != null ? Number(r.price) : null,
  }));
}

export async function runPublishGateGrocery(batchSize = 100) {
  return runGroceryPublishGate(batchSize);
}

export async function runGroceryPublishGate(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, cover_image_url, phone, address, menu_items_json, vertical")
    .eq("vertical", "grocery")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], passed: 0, failed: 0 };
  }

  const results: GateResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const m of merchants) {
    const failures: string[] = [];

    if (!m.name || m.name.trim().length < 2) failures.push("missing_name");
    if (!m.address) failures.push("missing_address");
    if (!m.phone) failures.push("missing_phone");
    if (!m.cover_image_url) failures.push("missing_cover_image");

    const items = toCatalogItems(m.menu_items_json);
    if (items.length === 0) failures.push("empty_catalog");
    if (items.length > 0 && items.length < 5) failures.push("catalog_too_small");

    const hasValidPrices = items.every((item) => item.price != null && Number(item.price) > 0);
    if (items.length > 0 && !hasValidPrices) failures.push("invalid_prices");

    const ok = failures.length === 0;
    const gateStatus = ok ? "passed" : "failed";
    const blockingReason = ok ? null : failures.join(", ");

    let persisted = false;
    try {
      const { error } = await db
        .from("seed_merchants")
        .update({ gate_status: gateStatus, blocking_reason: blockingReason })
        .eq("id", m.id);
      persisted = !error;
    } catch {
      persisted = false;
    }

    results.push({ shopId: m.id, shopName: m.name ?? "", passed: ok, failures, persisted });
    if (ok) passed++;
    else failed++;
  }

  for (const r of results) {
    platformBus.emit(r.passed ? "PUBLISH_GATE_PASSED" : "PUBLISH_GATE_BLOCKED", {
      shopId: r.shopId,
      vertical: "grocery",
      failures: r.failures,
    }, "engine");
  }

  return { status: "completed", results, passed, failed };
}
