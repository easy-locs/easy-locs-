import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, RemediationEntry } from "../types";
import { quarantineEntity } from "../quarantine";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_RESTAURANTS, FALLBACK_MENUS } from "@/data/fallback-restaurants";
import { FALLBACK_SERVICES, FALLBACK_SERVICE_ITEMS } from "@/data/fallback-services";

export class ReferenceIntegrityEngine extends DataQualityEngine {
  constructor() {
    super("ReferenceIntegrityEngine", "Detect orphan entities, broken route targets, dead links, broken parent-child references", { priority: 4 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const findings: EntityFinding[] = [];

    for (const hotel of FALLBACK_HOTELS) {
      for (const room of hotel.room_types) {
        if (room.hotel_id !== hotel.id) {
          findings.push({
            entityId: room.id,
            source: "FALLBACK_HOTELS",
            vertical: "stay",
            category: hotel.category,
            subcategory: hotel.subcategory,
            entityType: "room",
            title: `${room.name} (in ${hotel.name})`,
            mediaSummary: room.image ? "present" : "NONE",
            classification: "BROKEN_REFERENCE",
            issues: [this.makeIssue("reference_integrity", "critical", "BROKEN_ROOM_REFERENCE", `Room "${room.name}" references hotel_id "${room.hotel_id}" but belongs to "${hotel.id}"`, "QUARANTINE", "room.hotel_id", hotel.id, room.hotel_id, "BROKEN_REFERENCE")],
          });
        }
      }
    }

    for (const rest of FALLBACK_RESTAURANTS) {
      const menuItems = FALLBACK_MENUS[rest.id];
      if (!menuItems || menuItems.length === 0) {
        findings.push({
          entityId: rest.id,
          source: "FALLBACK_RESTAURANTS",
          vertical: rest.vertical,
          category: rest.category,
          subcategory: rest.subcategory,
          entityType: "merchant",
          title: rest.name,
          mediaSummary: rest.banner_url ? "present" : "NONE",
          classification: "VALID_WITH_WARNINGS",
          issues: [this.makeIssue("reference_integrity", "medium", "NO_MENU_ITEMS", `Restaurant "${rest.name}" has no menu items`, "REVIEW_NEEDED", "menu", undefined, undefined, "BROKEN_REFERENCE")],
        });
      } else {
        for (const item of menuItems) {
          if (item.shop_id !== rest.id) {
            findings.push({
              entityId: item.id,
              source: "FALLBACK_RESTAURANTS",
              vertical: rest.vertical,
              category: rest.category,
              subcategory: rest.subcategory,
              entityType: "menu_item",
              title: `${item.name} (in ${rest.name})`,
              mediaSummary: "N/A",
              classification: "BROKEN_REFERENCE",
              issues: [this.makeIssue("reference_integrity", "critical", "BROKEN_MENU_REFERENCE", `Menu item "${item.name}" references shop_id "${item.shop_id}" but restaurant is "${rest.id}"`, "QUARANTINE", "menuItem.shop_id", rest.id, item.shop_id, "BROKEN_REFERENCE")],
            });
          }
        }
      }
    }

    const serviceIds = new Set(FALLBACK_SERVICES.map((s) => s.id));
    for (const svc of FALLBACK_SERVICES) {
      const items = FALLBACK_SERVICE_ITEMS.filter((i) => i.provider_id === svc.id);
      if (items.length === 0) {
        findings.push({
          entityId: svc.id,
          source: "FALLBACK_SERVICES",
          vertical: svc.vertical,
          category: svc.category,
          subcategory: svc.subcategory,
          entityType: "provider",
          title: svc.name,
          mediaSummary: svc.banner_url ? "present" : "NONE",
          classification: "VALID_WITH_WARNINGS",
          issues: [this.makeIssue("reference_integrity", "medium", "NO_SERVICE_ITEMS", `Provider "${svc.name}" has no service items`, "REVIEW_NEEDED", "serviceItems", undefined, undefined, "BROKEN_REFERENCE")],
        });
      }
    }

    for (const item of FALLBACK_SERVICE_ITEMS) {
      if (!serviceIds.has(item.provider_id)) {
        findings.push({
          entityId: item.id,
          source: "FALLBACK_SERVICE_ITEMS",
          vertical: "services",
          category: item.category,
          subcategory: "",
          entityType: "service_item",
          title: item.name,
          mediaSummary: item.image ? "present" : "NONE",
          classification: "ORPHAN",
          issues: [this.makeIssue("reference_integrity", "critical", "ORPHAN_SERVICE_ITEM", `Service item "${item.name}" references provider "${item.provider_id}" which does not exist`, "QUARANTINE", "provider_id", undefined, item.provider_id, "ORPHAN_ENTITY")],
        });
      }
    }

    return findings;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    for (const f of findings) {
      const hasOrphan = f.issues.some((i) => i.reasonCode === "ORPHAN_ENTITY");
      const hasBroken = f.issues.some((i) => i.severity === "critical" && i.category === "reference_integrity");

      if (hasOrphan) {
        f.classification = "ORPHAN";
        f.decisionTier = "QUARANTINE";
      } else if (hasBroken) {
        f.classification = "BROKEN_REFERENCE";
        f.decisionTier = "QUARANTINE";
      } else {
        f.classification = "VALID_WITH_WARNINGS";
        f.decisionTier = "REVIEW_NEEDED";
      }
    }
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      if (f.decisionTier === "QUARANTINE" && (mode === "SAFE_AUTO" || mode === "QUARANTINE_PROTECT")) {
        quarantineEntity({
          entityId: f.entityId,
          source: f.source,
          vertical: f.vertical,
          title: f.title,
          classification: f.classification,
          reasonCodes: f.issues.map((i) => i.code),
          quarantinedAt: now,
          reviewable: true,
          quarantinedBy: this.name,
          visibilityEffect: "quarantined",
          restorable: true,
        });
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "quarantined",
          beforeState: f.classification,
          afterState: "QUARANTINED",
          reason: `Reference integrity violation: ${f.issues.map((i) => i.code).join(", ")}`,
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "QUARANTINE",
          playbook: "broken_reference_isolate",
        });
      }
    }
    return remediations;
  }
}
