import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface LinkageCheck {
  entity: string;
  entityId: string;
  layer: string;
  status: "linked" | "broken" | "missing";
  details: string;
}

export async function runFullStackLinkageCheck(batchSize = 100) {
  const checks: LinkageCheck[] = [];

  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, vertical, visibility_mode, gate_status, pipeline_stage, storefront_slug")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], checked: 0, broken: 0 };
  }

  for (const m of merchants) {
    if (!m.vertical) {
      checks.push({
        entity: m.name ?? m.id,
        entityId: m.id,
        layer: "taxonomy",
        status: "missing",
        details: "No vertical assigned",
      });
    }

    if (!m.pipeline_stage) {
      checks.push({
        entity: m.name ?? m.id,
        entityId: m.id,
        layer: "pipeline",
        status: "missing",
        details: "No pipeline stage set",
      });
    }

    if (m.visibility_mode === "search_only" || m.visibility_mode === "full") {
      if (!m.gate_status || m.gate_status === "pending") {
        checks.push({
          entity: m.name ?? m.id,
          entityId: m.id,
          layer: "publish-gate",
          status: "broken",
          details: `Visible (${m.visibility_mode}) but gate not passed: ${m.gate_status ?? "null"}`,
        });
      }
    }

    if (m.visibility_mode === "hidden" && m.gate_status === "passed") {
      checks.push({
        entity: m.name ?? m.id,
        entityId: m.id,
        layer: "visibility",
        status: "broken",
        details: "Gate passed but still hidden — auto-publish missed",
      });
    }

    if (!m.storefront_slug && m.visibility_mode !== "hidden") {
      checks.push({
        entity: m.name ?? m.id,
        entityId: m.id,
        layer: "storefront",
        status: "missing",
        details: "Visible entity has no storefront slug",
      });
    }
  }

  const broken = checks.filter(c => c.status === "broken").length;
  const missing = checks.filter(c => c.status === "missing").length;

  platformBus.emit("system:pipeline_completed", {
    engine: "full-stack-linkage",
    checked: merchants.length,
    broken,
    missing,
  }, "engine");

  return {
    status: "completed",
    results: checks,
    checked: merchants.length,
    broken,
    missing,
    healthy: merchants.length - new Set(checks.filter(c => c.status !== "linked").map(c => c.entityId)).size,
  };
}
