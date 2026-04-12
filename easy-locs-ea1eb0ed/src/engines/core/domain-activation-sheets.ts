import { registerActivationSheet, type DomainActivationSheet } from "./repair-safety";

const DASHBOARD_SHEET: DomainActivationSheet = {
  domain: "dashboard",
  version: 1,
  activeEngines: [
    "runtime-health",
    "layout-integrity",
    "card-health",
    "banner-strategy",
    "flow-closure",
    "design-regression",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset", "reconnect"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["dashboard:repair:kill"],
  rollbackTriggers: ["dashboard:card:render_failure", "dashboard:layout:broken"],
  freezeTriggers: ["dashboard:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-phase3",
};

const TAXONOMY_SHEET: DomainActivationSheet = {
  domain: "taxonomy",
  version: 1,
  activeEngines: [
    "taxonomy-governance",
    "vertical-isolation",
    "taxonomy-enforcer",
    "canonical-mapping",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["reconnect", "suppress"],
  killSwitches: ["taxonomy:repair:kill"],
  rollbackTriggers: ["taxonomy:misclassification:detected"],
  freezeTriggers: ["taxonomy:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-phase3",
};

const MEDIA_SHEET: DomainActivationSheet = {
  domain: "media",
  version: 1,
  activeEngines: [
    "media-relevance",
    "media-flow",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["reconnect", "suppress"],
  killSwitches: ["media:repair:kill"],
  rollbackTriggers: ["media:broken_asset:cascade"],
  freezeTriggers: ["media:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-phase3",
};

const NOTIFICATION_SHEET: DomainActivationSheet = {
  domain: "notification",
  version: 1,
  activeEngines: [
    "notification-handler",
    "retry-replay",
  ],
  allowedL2Operations: ["invalidate", "refresh", "suppress"],
  requiredL3Operations: ["reset", "reconnect"],
  forbiddenOperations: [],
  killSwitches: ["notification:repair:kill"],
  rollbackTriggers: ["notification:delivery:cascade_failure"],
  freezeTriggers: ["notification:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-phase3",
};

const MARKETPLACE_SHEET: DomainActivationSheet = {
  domain: "marketplace",
  version: 1,
  activeEngines: [
    "text-integrity",
    "taxonomy-governance",
    "vertical-isolation",
    "media-relevance",
    "profile-quality",
    "data-cleaning",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset", "reconnect"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["marketplace:repair:kill"],
  rollbackTriggers: ["marketplace:listing:data_corruption", "marketplace:search:index_failure"],
  freezeTriggers: ["marketplace:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-phase3",
};

const ALL_ACTIVATION_SHEETS: DomainActivationSheet[] = [
  DASHBOARD_SHEET,
  TAXONOMY_SHEET,
  MEDIA_SHEET,
  NOTIFICATION_SHEET,
  MARKETPLACE_SHEET,
];

export function registerAllActivationSheets(): void {
  for (const sheet of ALL_ACTIVATION_SHEETS) {
    registerActivationSheet(sheet);
  }
}

export function getRegisteredDomains(): string[] {
  return ALL_ACTIVATION_SHEETS.map(s => s.domain);
}

export function getSheetCount(): number {
  return ALL_ACTIVATION_SHEETS.length;
}
