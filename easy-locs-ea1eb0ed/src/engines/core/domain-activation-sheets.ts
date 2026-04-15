import { registerActivationSheet, type DomainActivationSheet } from "./repair-safety";

const DASHBOARD_SHEET: DomainActivationSheet = {
  domain: "dashboard",
  version: 2,
  activeEngines: [
    "repair-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset", "reconnect"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["dashboard:repair:kill"],
  rollbackTriggers: ["dashboard:card:render_failure", "dashboard:layout:broken"],
  freezeTriggers: ["dashboard:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const TAXONOMY_SHEET: DomainActivationSheet = {
  domain: "taxonomy",
  version: 2,
  activeEngines: [
    "taxonomy-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["reconnect", "suppress"],
  killSwitches: ["taxonomy:repair:kill"],
  rollbackTriggers: ["taxonomy:misclassification:detected"],
  freezeTriggers: ["taxonomy:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const MEDIA_SHEET: DomainActivationSheet = {
  domain: "media",
  version: 2,
  activeEngines: [
    "ui-correction-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["reconnect", "suppress"],
  killSwitches: ["media:repair:kill"],
  rollbackTriggers: ["media:broken_asset:cascade"],
  freezeTriggers: ["media:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const NOTIFICATION_SHEET: DomainActivationSheet = {
  domain: "notification",
  version: 2,
  activeEngines: [
    "repair-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh", "suppress"],
  requiredL3Operations: ["reset", "reconnect"],
  forbiddenOperations: [],
  killSwitches: ["notification:repair:kill"],
  rollbackTriggers: ["notification:delivery:cascade_failure"],
  freezeTriggers: ["notification:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const MARKETPLACE_SHEET: DomainActivationSheet = {
  domain: "marketplace",
  version: 2,
  activeEngines: [
    "taxonomy-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset", "reconnect"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["marketplace:repair:kill"],
  rollbackTriggers: ["marketplace:listing:data_corruption", "marketplace:search:index_failure"],
  freezeTriggers: ["marketplace:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const UI_SHEET: DomainActivationSheet = {
  domain: "ui",
  version: 2,
  activeEngines: [
    "repair-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["ui:repair:kill"],
  rollbackTriggers: ["ui:dom:cascade_failure"],
  freezeTriggers: ["ui:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const TEXT_SHEET: DomainActivationSheet = {
  domain: "text",
  version: 2,
  activeEngines: ["ui-correction-engine"],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress", "reconnect"],
  killSwitches: ["text:repair:kill"],
  rollbackTriggers: ["text:encoding:cascade_failure"],
  freezeTriggers: ["text:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const I18N_SHEET: DomainActivationSheet = {
  domain: "i18n",
  version: 2,
  activeEngines: ["ui-correction-engine"],
  allowedL2Operations: ["refresh", "fallback"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress", "invalidate"],
  killSwitches: ["i18n:repair:kill"],
  rollbackTriggers: ["i18n:locale:cascade_failure"],
  freezeTriggers: ["i18n:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const LAYOUT_SHEET: DomainActivationSheet = {
  domain: "layout",
  version: 2,
  activeEngines: ["repair-engine", "flow-integrity-engine"],
  allowedL2Operations: ["invalidate", "refresh", "fallback"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["layout:repair:kill"],
  rollbackTriggers: ["layout:dom:cascade_failure"],
  freezeTriggers: ["layout:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const FOOD_SHEET: DomainActivationSheet = {
  domain: "food",
  version: 2,
  activeEngines: [
    "taxonomy-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress", "reconnect"],
  killSwitches: ["food:repair:kill"],
  rollbackTriggers: ["food:menu:cascade_failure"],
  freezeTriggers: ["food:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const GROCERY_SHEET: DomainActivationSheet = {
  domain: "grocery",
  version: 2,
  activeEngines: [
    "taxonomy-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress", "reconnect"],
  killSwitches: ["grocery:repair:kill"],
  rollbackTriggers: ["grocery:catalog:cascade_failure"],
  freezeTriggers: ["grocery:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const SERVICES_SHEET: DomainActivationSheet = {
  domain: "services",
  version: 2,
  activeEngines: [
    "taxonomy-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["services:repair:kill"],
  rollbackTriggers: ["services:booking:cascade_failure"],
  freezeTriggers: ["services:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const PROPERTY_SHEET: DomainActivationSheet = {
  domain: "property",
  version: 2,
  activeEngines: [
    "taxonomy-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress"],
  killSwitches: ["property:repair:kill"],
  rollbackTriggers: ["property:listing:cascade_failure"],
  freezeTriggers: ["property:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const SEO_SHEET: DomainActivationSheet = {
  domain: "seo",
  version: 2,
  activeEngines: [
    "repair-engine",
    "flow-integrity-engine",
  ],
  allowedL2Operations: ["invalidate", "refresh"],
  requiredL3Operations: ["reset"],
  forbiddenOperations: ["suppress", "reconnect"],
  killSwitches: ["seo:repair:kill"],
  rollbackTriggers: ["seo:canonical:cascade_failure"],
  freezeTriggers: ["seo:consecutive_rollback:3"],
  approvedAt: Date.now(),
  approvedBy: "architecture-consolidation",
};

const ALL_ACTIVATION_SHEETS: DomainActivationSheet[] = [
  DASHBOARD_SHEET,
  TAXONOMY_SHEET,
  MEDIA_SHEET,
  NOTIFICATION_SHEET,
  MARKETPLACE_SHEET,
  UI_SHEET,
  TEXT_SHEET,
  I18N_SHEET,
  LAYOUT_SHEET,
  FOOD_SHEET,
  GROCERY_SHEET,
  SERVICES_SHEET,
  PROPERTY_SHEET,
  SEO_SHEET,
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

export function getAllSheetEngineIds(): string[] {
  const ids = new Set<string>();
  for (const sheet of ALL_ACTIVATION_SHEETS) {
    for (const id of sheet.activeEngines) ids.add(id);
  }
  return [...ids];
}
