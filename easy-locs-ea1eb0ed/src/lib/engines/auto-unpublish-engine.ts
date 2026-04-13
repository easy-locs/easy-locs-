import { db } from "@/services/db";

interface UnpublishResult {
  shopId: string;
  shopName: string;
  reason: string;
  persisted: boolean;
}

export async function runAutoUnpublish(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, visibility_mode, gate_status, blocking_reason, rating, reviews_count, updated_at")
    .in("visibility_mode", ["search_only", "full"])
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], unpublished: 0 };
  }

  const results: UnpublishResult[] = [];
  let unpublished = 0;
  const now = Date.now();

  for (const m of merchants) {
    const reasons: string[] = [];

    if (m.gate_status === "failed") {
      reasons.push("gate_failed");
    }

    if (m.blocking_reason && m.blocking_reason.length > 0) {
      reasons.push(`blocking_reason: ${m.blocking_reason}`);
    }

    const updatedAt = m.updated_at ? new Date(m.updated_at).getTime() : 0;
    const staleDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
    if (staleDays > 180) {
      reasons.push(`stale_${Math.round(staleDays)}d`);
    }

    if (reasons.length === 0) continue;

    let persisted = false;
    try {
      const { error } = await db
        .from("seed_merchants")
        .update({ visibility_mode: "hidden" })
        .eq("id", m.id);
      persisted = !error;
    } catch {
      persisted = false;
    }

    results.push({ shopId: m.id, shopName: m.name ?? "", reason: reasons.join("; "), persisted });
    if (persisted) {
      unpublished++;
    }
  }

  return { status: "completed", results, unpublished };
}
