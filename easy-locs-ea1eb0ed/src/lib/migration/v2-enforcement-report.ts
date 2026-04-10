export type V2EnforcementReport = {
  orbitCoreLegacyBlocked: boolean;
  orbitCoreV2Only: boolean;
  deadFilesRemoved: string[];
  isolatedLegacyFiles: string[];
  pendingExternalMigrations: string[];
};

export const DEFAULT_V2_ENFORCEMENT_REPORT: V2EnforcementReport = {
  orbitCoreLegacyBlocked: true,
  orbitCoreV2Only: true,
  deadFilesRemoved: [],
  isolatedLegacyFiles: [
    "src/pages/tenant/TenantMessages.tsx",
    "src/pages/client/ClientMessages.tsx",
    "src/components/delivery/InMissionChat.tsx",
    "src/components/delivery/LiveDeliveryChat.tsx",
  ],
  pendingExternalMigrations: [
    "tenant/client portals",
    "delivery chat domain",
    "external marketplace contact flows",
  ],
};
