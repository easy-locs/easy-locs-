import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface ServiceItem {
  name: string;
  price: number | null;
  price_range: string | null;
}

interface GateResult {
  shopId: string;
  shopName: string;
  passed: boolean;
  failures: string[];
  persisted: boolean;
}

function toServiceItems(raw: unknown): ServiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    price: r.price != null ? Number(r.price) : null,
    price_range: r.price_range != null ? String(r.price_range) : null,
  }));
}

export async function runPublishGateService(batchSize = 100) {
  return runServicePublishGate(batchSize);
}

export async function runServicePublishGate(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, cover_image_url, phone, address, description, service_catalog_json, vertical")
    .eq("vertical", "services")
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

    const services = toServiceItems(m.service_catalog_json);
    if (services.length === 0) failures.push("empty_catalog");

    const hasPrices = services.every((s) => s.price != null || s.price_range != null);
    if (services.length > 0 && !hasPrices) failures.push("missing_prices");

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
      vertical: "services",
      failures: r.failures,
    }, "engine");
  }

  return { status: "completed", results, passed, failed };
}
