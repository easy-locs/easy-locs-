import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface MenuItem {
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

function toMenuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    price: r.price != null ? Number(r.price) : null,
  }));
}

export async function runPublishGateFood(batchSize = 100) {
  return runFoodPublishGate(batchSize);
}

export async function runFoodPublishGate(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, cover_image_url, logo_url, phone, address, description, menu_items_json, vertical")
    .eq("vertical", "food")
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
    if (!m.description || m.description.length < 10) failures.push("weak_description");

    const menu = toMenuItems(m.menu_items_json);
    if (menu.length === 0) failures.push("empty_menu");
    if (menu.length > 0 && menu.length < 3) failures.push("menu_too_small");

    const hasValidPrices = menu.every((item) => item.price != null && Number(item.price) > 0);
    if (menu.length > 0 && !hasValidPrices) failures.push("invalid_menu_prices");

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
      vertical: "food",
      failures: r.failures,
    }, "engine");
  }

  return { status: "completed", results, passed, failed };
}
