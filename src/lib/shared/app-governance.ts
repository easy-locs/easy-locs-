export const APP_GOVERNANCE = {
  mode: "v2_plus_only",

  canonicalMessagingTables: [
    "conversations_v2",
    "chat_messages_v2",
  ],

  canonicalNotificationTables: [
    "app_notifications",
  ],

  canonicalContactsTables: [
    "orbit_contacts_v2",
  ],

  canonicalPrivacyTables: [
    "orbit_user_settings_v2",
  ],

  forbiddenLegacyTablesInCore: [
    "messages",
    "conversation_threads",
    "chat_threads",
    "legacy_notifications",
  ],

  isolatedLegacyZones: [
    "src/pages/tenant",
    "src/pages/client",
    "src/components/delivery",
    "src/components/rental",
  ],

  coreZones: [
    "src/modules/orbit",
    "src/modules/wallet",
    "src/modules/radar",
    "src/modules/dashboard",
    "src/modules/marketplace",
    "src/modules/travel",
    "src/modules/admin-cockpit",
    "src/hooks",
    "src/lib/orbit",
    "src/lib/wallet",
    "src/lib/browser-repair",
  ],
} as const;
