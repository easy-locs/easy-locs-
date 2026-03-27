export type LegacyIsolationStatus =
  | "legacy_isolated"
  | "scheduled_for_delete"
  | "kept_outside_core"
  | "migrated"
  | "blocked";

export type LegacyIsolationEntry = {
  path: string;
  domain: "orbit_core" | "tenant_portal" | "client_portal" | "delivery" | "marketplace" | "unknown";
  status: LegacyIsolationStatus;
  note: string;
};

export const LEGACY_ISOLATION_REGISTRY: LegacyIsolationEntry[] = [
  {
    path: "src/pages/tenant/TenantMessages.tsx",
    domain: "tenant_portal",
    status: "kept_outside_core",
    note: "Not Orbit core. Keep temporarily isolated.",
  },
  {
    path: "src/pages/client/ClientMessages.tsx",
    domain: "client_portal",
    status: "kept_outside_core",
    note: "Not Orbit core. Keep temporarily isolated.",
  },
  {
    path: "src/components/delivery/InMissionChat.tsx",
    domain: "delivery",
    status: "kept_outside_core",
    note: "Delivery domain. Migrate later as separate module.",
  },
  {
    path: "src/components/delivery/LiveDeliveryChat.tsx",
    domain: "delivery",
    status: "kept_outside_core",
    note: "Delivery domain. Migrate later as separate module.",
  },
  {
    path: "src/lib/chat/conversationService.ts",
    domain: "orbit_core",
    status: "migrated",
    note: "Facade only. No duplicate implementation allowed.",
  },
];
