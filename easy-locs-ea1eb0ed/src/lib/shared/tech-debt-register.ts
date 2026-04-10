export const TECH_DEBT_REGISTER = [
  { key: "legacy_messages_isolated", status: "allowed_temporarily", scope: "tenant_client_legacy" },
  { key: "radar_visual_upgrade_pending", status: "planned", scope: "radar" },
  { key: "wallet_pos_full_sync_pending", status: "in_progress", scope: "wallet" },
  { key: "browser_repair_full_coverage_pending", status: "in_progress", scope: "admin-cockpit" },
] as const;
