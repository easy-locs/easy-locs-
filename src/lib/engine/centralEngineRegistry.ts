export type EngineModuleKey =
  | "orders"
  | "payments"
  | "dispatch"
  | "wallet"
  | "support"
  | "notifications"
  | "analytics"
  | "merchant"
  | "driver"
  | "loyalty";

export type EngineModuleState = {
  key: EngineModuleKey;
  label: string;
  enabled: boolean;
  healthy: boolean;
  lastCheckAt: string | null;
  notes?: string;
};

export const DEFAULT_ENGINE_REGISTRY: EngineModuleState[] = [
  { key: "orders", label: "Orders Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "payments", label: "Payments Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "dispatch", label: "Dispatch Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "wallet", label: "Wallet Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "support", label: "Support Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "notifications", label: "Notifications Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "analytics", label: "Analytics Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "merchant", label: "Merchant Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "driver", label: "Driver Engine", enabled: true, healthy: false, lastCheckAt: null },
  { key: "loyalty", label: "Loyalty Engine", enabled: true, healthy: false, lastCheckAt: null },
];
