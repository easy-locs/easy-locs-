/**
 * Module Link Engine — Validates end-to-end wiring between taxonomy and all 5 pillars.
 * Detects: dead flows, missing wiring, orphan categories, broken links.
 *
 * Brain Owner: experience
 * Tier: standard
 * Business Function: infrastructure
 */

import { CATEGORY_TREE, type PrimaryCategory } from "@/lib/taxonomy/category-tree";
import {
  MODULE_WIRING,
  type VerticalKey,
  type ModuleWiring,
  getVerticalForCategoryKey,
} from "@/lib/taxonomy/module-wiring";
import type { EngineRunResult } from "./engine-metadata-registry";

export interface WiringIssue {
  severity: "critical" | "warning" | "info";
  module: "dashboard" | "radar" | "orbit" | "wallet" | "me" | "taxonomy";
  vertical: string;
  message: string;
  field?: string;
}

export interface ModuleLinkReport {
  totalCategories: number;
  totalVerticals: number;
  wiredVerticals: number;
  unwiredCategories: string[];
  issues: WiringIssue[];
  flowValidation: FlowValidation[];
  score: number;
}

export interface FlowValidation {
  vertical: string;
  flow: string;
  steps: string[];
  status: "complete" | "partial" | "broken";
  missingStep?: string;
}

function validateVerticalWiring(vertical: VerticalKey, wiring: ModuleWiring): WiringIssue[] {
  const issues: WiringIssue[] = [];

  if (wiring.dashboard.shortcuts.length === 0) {
    issues.push({
      severity: "warning",
      module: "dashboard",
      vertical,
      message: `No dashboard shortcuts defined`,
      field: "shortcuts",
    });
  }

  if (wiring.radar.primaryFilters.length === 0) {
    issues.push({
      severity: "critical",
      module: "radar",
      vertical,
      message: `No radar filters defined — discovery is broken`,
      field: "primaryFilters",
    });
  }

  if (wiring.orbit.threadTypes.length === 0 && wiring.wallet.paymentFlow !== "none") {
    issues.push({
      severity: "warning",
      module: "orbit",
      vertical,
      message: `Has payment flow but no Orbit thread types — user cannot contact for support`,
    });
  }

  if (wiring.wallet.paymentFlow !== "none" && !wiring.wallet.currencyAware) {
    issues.push({
      severity: "warning",
      module: "wallet",
      vertical,
      message: `Has payment flow but is not currency-aware — multi-currency support missing`,
      field: "currencyAware",
    });
  }

  if (wiring.me.historyType === "" || !wiring.me.historyType) {
    issues.push({
      severity: "warning",
      module: "me",
      vertical,
      message: `No history type defined — user cannot review past activity`,
      field: "historyType",
    });
  }

  if (wiring.dashboard.showActiveOrders && wiring.wallet.paymentFlow === "none") {
    issues.push({
      severity: "info",
      module: "dashboard",
      vertical,
      message: `Shows active orders but has no payment flow`,
    });
  }

  return issues;
}

function validateEndToEndFlow(vertical: VerticalKey, wiring: ModuleWiring): FlowValidation[] {
  const flows: FlowValidation[] = [];

  const discoveryFlow: FlowValidation = {
    vertical,
    flow: "discovery → detail → contact → pay → track",
    steps: [],
    status: "complete",
  };

  if (wiring.radar.primaryFilters.length > 0) {
    discoveryFlow.steps.push("Radar:discover");
  } else {
    discoveryFlow.status = "broken";
    discoveryFlow.missingStep = "Radar discovery";
  }

  if (wiring.orbit.threadTypes.length > 0) {
    discoveryFlow.steps.push("Orbit:contact");
  } else {
    if (discoveryFlow.status === "complete") discoveryFlow.status = "partial";
  }

  if (wiring.wallet.paymentFlow !== "none") {
    discoveryFlow.steps.push("Wallet:pay");
  }

  if (wiring.dashboard.showActiveOrders || wiring.dashboard.showUpcomingBookings) {
    discoveryFlow.steps.push("Dashboard:track");
  }

  if (wiring.me.historyType) {
    discoveryFlow.steps.push("Me:history");
  }

  flows.push(discoveryFlow);

  if (wiring.dashboard.quickActions.length > 0) {
    const quickFlow: FlowValidation = {
      vertical,
      flow: "dashboard shortcut → radar → action",
      steps: ["Dashboard:shortcut"],
      status: "complete",
    };

    if (wiring.radar.primaryFilters.length > 0) {
      quickFlow.steps.push("Radar:results");
    }

    if (wiring.wallet.paymentFlow !== "none") {
      quickFlow.steps.push("Wallet:complete");
    }

    if (wiring.me.historyType) {
      quickFlow.steps.push("Me:saved");
    }

    flows.push(quickFlow);
  }

  return flows;
}

export function runModuleLinkEngine(): ModuleLinkReport {
  const issues: WiringIssue[] = [];
  const flowValidations: FlowValidation[] = [];
  const unwiredCategories: string[] = [];

  for (const cat of CATEGORY_TREE) {
    const vertical = getVerticalForCategoryKey(cat.key);
    if (!vertical) {
      unwiredCategories.push(cat.key);
      issues.push({
        severity: "critical",
        module: "taxonomy",
        vertical: cat.key,
        message: `Category "${cat.key}" has no module wiring — completely disconnected`,
      });
    }
  }

  const wiredVerticals = new Set<string>();

  for (const [key, wiring] of Object.entries(MODULE_WIRING)) {
    const vertical = key as VerticalKey;
    wiredVerticals.add(vertical);

    const wiringIssues = validateVerticalWiring(vertical, wiring);
    issues.push(...wiringIssues);

    const flows = validateEndToEndFlow(vertical, wiring);
    flowValidations.push(...flows);
  }

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const totalChecks = CATEGORY_TREE.length * 5;
  const score = Math.max(0, Math.round(100 - (criticalCount * 15) - (warningCount * 3)));

  return {
    totalCategories: CATEGORY_TREE.length,
    totalVerticals: Object.keys(MODULE_WIRING).length,
    wiredVerticals: wiredVerticals.size,
    unwiredCategories,
    issues,
    flowValidation: flowValidations,
    score,
  };
}

export function toEngineRunResult(report: ModuleLinkReport): EngineRunResult {
  const criticals = report.issues.filter(i => i.severity === "critical").length;
  return {
    status: criticals > 0 ? "warning" : "ok",
    itemsProcessed: report.totalCategories,
    rowsAffected: 0,
    businessImpact: criticals > 0
      ? `${criticals} critical wiring issue(s) — some flows are broken`
      : `All ${report.wiredVerticals} verticals fully wired end-to-end`,
    summary: `Score: ${report.score}/100 | ${report.totalCategories} categories | ${report.wiredVerticals} verticals wired | ${report.issues.length} issues`,
  };
}
