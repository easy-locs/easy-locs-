/**
 * Activation Engine — Canonical activation logic for shops.
 * Controls: visibility, commerce, publication, and lifecycle state.
 * Integrates: audit engine + source hygiene + catalog audit.
 */
import { auditShop, type ShopAuditResult } from "@/lib/audit/shop-audit";
import { getSourceRules, type SourceType } from "@/lib/source/source-hygiene";
import { auditMenu, type MenuAuditResult } from "@/lib/audit/catalog-audit";

// ── Activation status ──
export type ActivationStatus =
  | "draft"
  | "needs_review"
  | "ready"
  | "searchable"
  | "orderable"
  | "live"
  | "paused"
  | "disabled";

export type ActivationAction =
  | "send_to_review"
  | "approve_search"
  | "approve_map"
  | "approve_ordering"
  | "set_ready"
  | "go_live"
  | "pause"
  | "unpause"
  | "disable";

export interface ActivationResult {
  status: ActivationStatus;
  previousStatus?: string;
  audit: ShopAuditResult;
  catalogAudit: MenuAuditResult;
  sourceType: SourceType;
  isClaimed: boolean;
  // Gate flags
  canBeSearchable: boolean;
  canBeMapVisible: boolean;
  canBeOrderable: boolean;
  canBeLive: boolean;
  // Allowed actions from current state
  allowedActions: ActivationAction[];
  // Checklist
  checklist: ActivationCheckItem[];
  blockers: string[];
  warnings: string[];
}

export interface ActivationCheckItem {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
  category: "identity" | "content" | "commerce" | "compliance" | "source";
}

// ── Main activation evaluator ──
export function evaluateActivation(shop: any, products?: any[]): ActivationResult {
  const audit = auditShop(shop);
  const catalogAudit = auditMenu(products ?? [], shop.vertical);
  const sourceType = (shop.source_type || "manual") as SourceType;
  const sourceRules = getSourceRules(sourceType);
  const isClaimed = !!shop.claimed_by_owner || !!shop.is_claimed;

  // Build checklist
  const checklist = buildChecklist(shop, audit, catalogAudit, sourceType, isClaimed);
  const blockers = checklist.filter((c) => c.required && !c.passed).map((c) => c.label);
  const warnings = audit.warnings;

  // Gate flags (audit + source)
  const canBeSearchable = audit.isSearchable && sourceRules.canBeSearchable;
  const canBeMapVisible = audit.isMapVisible && sourceRules.canBeMapVisible;
  const canBeOrderable = audit.isOrderable && (isClaimed || !sourceRules.requiresClaim) && sourceRules.canBeOrderable;
  const canBeLive = audit.isPublishable && (isClaimed || !sourceRules.requiresClaim) && sourceRules.canBeLive && blockers.length === 0;

  // Determine effective status
  const status = determineStatus(shop, audit, canBeSearchable, canBeOrderable, canBeLive, blockers);

  // Determine allowed actions
  const allowedActions = getAllowedActions(status, canBeSearchable, canBeMapVisible, canBeOrderable, canBeLive);

  return {
    status,
    previousStatus: shop.activation_status || shop.readiness_status,
    audit,
    catalogAudit,
    sourceType,
    isClaimed,
    canBeSearchable,
    canBeMapVisible,
    canBeOrderable,
    canBeLive,
    allowedActions,
    checklist,
    blockers,
    warnings,
  };
}

function determineStatus(
  shop: any,
  audit: ShopAuditResult,
  canSearch: boolean,
  canOrder: boolean,
  canLive: boolean,
  blockers: string[]
): ActivationStatus {
  // Respect explicit paused/disabled
  if (shop.activation_status === "paused") return "paused";
  if (shop.activation_status === "disabled") return "disabled";

  if (blockers.length > 0) {
    return audit.score >= 50 ? "needs_review" : "draft";
  }

  if (canLive && shop.activation_status === "live") return "live";
  if (canOrder) return "orderable";
  if (canSearch) return "searchable";
  if (audit.score >= 75) return "ready";
  if (audit.score >= 50) return "needs_review";
  return "draft";
}

function getAllowedActions(
  status: ActivationStatus,
  canSearch: boolean,
  canMap: boolean,
  canOrder: boolean,
  canLive: boolean
): ActivationAction[] {
  const actions: ActivationAction[] = [];

  switch (status) {
    case "draft":
      actions.push("send_to_review");
      break;
    case "needs_review":
      if (canSearch) actions.push("approve_search");
      if (canMap) actions.push("approve_map");
      actions.push("send_to_review");
      break;
    case "ready":
      if (canSearch) actions.push("approve_search");
      if (canMap) actions.push("approve_map");
      if (canOrder) actions.push("approve_ordering");
      if (canLive) actions.push("go_live");
      break;
    case "searchable":
      if (canOrder) actions.push("approve_ordering");
      if (canLive) actions.push("go_live");
      actions.push("pause");
      break;
    case "orderable":
      if (canLive) actions.push("go_live");
      actions.push("pause");
      break;
    case "live":
      actions.push("pause");
      actions.push("disable");
      break;
    case "paused":
      actions.push("unpause");
      actions.push("disable");
      break;
    case "disabled":
      actions.push("send_to_review");
      break;
  }

  return actions;
}

function buildChecklist(
  shop: any,
  audit: ShopAuditResult,
  catalog: MenuAuditResult,
  sourceType: SourceType,
  isClaimed: boolean
): ActivationCheckItem[] {
  const sourceRules = getSourceRules(sourceType);

  return [
    // Identity
    { key: "name", label: "Business name", passed: !!shop.name, required: true, category: "identity" },
    { key: "slug", label: "URL slug", passed: !!shop.slug, required: true, category: "identity" },
    { key: "vertical", label: "Business vertical", passed: !!shop.vertical, required: true, category: "identity" },

    // Content
    { key: "logo", label: "Logo image", passed: !!(shop.logo_url || shop.logo_image), required: true, category: "content" },
    { key: "cover", label: "Cover image", passed: !!(shop.cover_url || shop.banner_url || shop.cover_image), required: false, category: "content" },
    { key: "description", label: "Description", passed: !!shop.description && shop.description.length > 10, required: false, category: "content" },
    { key: "catalog", label: "Menu / catalog", passed: catalog.qualityScore >= 40, required: audit.isOrderable, category: "content" },

    // Commerce
    { key: "location", label: "Address / coordinates", passed: !!(shop.latitude && shop.longitude) || !!shop.address, required: true, category: "commerce" },
    { key: "phone", label: "Phone number", passed: !!shop.phone, required: false, category: "commerce" },
    { key: "city", label: "City", passed: !!shop.city, required: true, category: "commerce" },

    // Source / compliance
    { key: "claimed", label: "Claimed by owner", passed: isClaimed || !sourceRules.requiresClaim, required: sourceRules.requiresClaim, category: "source" },
    { key: "audit_pass", label: "Audit score ≥ 75", passed: audit.score >= 75, required: true, category: "compliance" },
  ];
}

// ── Persistence payload ──
export function getActivationUpdatePayload(result: ActivationResult): Record<string, any> {
  return {
    activation_status: result.status,
    activated_at: result.status === "live" ? new Date().toISOString() : undefined,
    activation_channel: "system",
    audit_score: result.audit.score,
    readiness_status: result.status,
    blocking_reason: result.blockers.length > 0 ? result.blockers.join("; ") : null,
    menu_quality_score: result.catalogAudit.qualityScore,
  };
}
