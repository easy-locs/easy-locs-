/**
 * Canonical scenario definitions for browser-user-repair-engine
 */
import type { ScenarioDefinition } from "./browser-repair-types";

export const CANONICAL_SCENARIOS: ScenarioDefinition[] = [
  // ── GLOBAL ──
  { key: "app_shell_load", pageKey: "/home", flowKey: "navigation", description: "App shell loads with nav", severityIfFail: "critical", canAutoFix: false, scope: "global", steps: [{ key: "shell_render", description: "Shell mounts" }] },

  // ── ORBIT ──
  { key: "orbit_load", pageKey: "/orbit", flowKey: "orbit_init", description: "Orbit landing loads", severityIfFail: "critical", canAutoFix: false, scope: "orbit", steps: [{ key: "profiles_accessible", description: "orbit_profiles_v2 accessible" }] },
  { key: "orbit_contacts_open", pageKey: "/orbit", flowKey: "contacts", description: "Contacts tab accessible", severityIfFail: "critical", canAutoFix: false, scope: "orbit", steps: [{ key: "contacts_count", description: "Count contacts" }] },
  { key: "orbit_contact_search", pageKey: "/orbit", flowKey: "search", description: "Contact search works", severityIfFail: "warning", canAutoFix: false, scope: "orbit", steps: [{ key: "search_query", description: "Search returns results" }] },
  { key: "orbit_open_direct_thread", pageKey: "/orbit/conversations", flowKey: "messaging", description: "Direct thread opens", severityIfFail: "critical", canAutoFix: false, scope: "orbit", steps: [{ key: "conversations_exist", description: "Conversations accessible" }, { key: "messages_exist", description: "Messages accessible" }] },
  { key: "orbit_send_text", pageKey: "/orbit/conversations", flowKey: "messaging", description: "Text message can be sent", severityIfFail: "critical", canAutoFix: false, scope: "orbit", steps: [{ key: "chat_messages_writable", description: "chat_messages_v2 writable" }] },
  { key: "orbit_start_audio_call", pageKey: "/orbit/calls", flowKey: "calling", description: "Audio call logs accessible", severityIfFail: "warning", canAutoFix: false, scope: "orbit", steps: [{ key: "call_logs_exist", description: "call_logs table accessible" }] },
  { key: "orbit_start_video_call", pageKey: "/orbit/calls", flowKey: "calling", description: "Video call data accessible", severityIfFail: "warning", canAutoFix: false, scope: "orbit", steps: [{ key: "call_logs_video", description: "Video call records" }] },
  { key: "orbit_create_group", pageKey: "/orbit", flowKey: "groups", description: "Group conversations accessible", severityIfFail: "warning", canAutoFix: false, scope: "orbit", steps: [{ key: "group_convs", description: "Group conversations exist" }] },
  { key: "orbit_add_group_member", pageKey: "/orbit", flowKey: "groups", description: "Group members manageable", severityIfFail: "warning", canAutoFix: false, scope: "orbit", steps: [{ key: "participants_valid", description: "Participants structure valid" }] },

  // ── MARKETPLACE ──
  { key: "marketplace_open", pageKey: "/marketplace", flowKey: "shop_listing", description: "Marketplace loads shops", severityIfFail: "critical", canAutoFix: false, scope: "marketplace", steps: [{ key: "shops_count", description: "Active shops exist" }] },
  { key: "marketplace_open_shop_detail", pageKey: "/marketplace/shop", flowKey: "shop_detail", description: "Shop detail renders", severityIfFail: "warning", canAutoFix: false, scope: "marketplace", steps: [{ key: "shop_fields", description: "Shop has required fields" }] },
  { key: "marketplace_contact_merchant", pageKey: "/marketplace", flowKey: "contact", description: "Contact CTA works", severityIfFail: "warning", canAutoFix: false, scope: "marketplace", steps: [{ key: "contact_cta", description: "Contact data available" }] },

  // ── HOTEL ──
  { key: "hotel_open_detail", pageKey: "/travel/hotels", flowKey: "hotel_booking", description: "Hotel chain integrity", severityIfFail: "critical", canAutoFix: false, scope: "hotel", steps: [{ key: "hotels_exist", description: "Hotels in DB" }, { key: "rooms_exist", description: "Rooms linked" }, { key: "rates_exist", description: "Rate plans linked" }, { key: "calendar_exist", description: "Calendar entries" }] },
  { key: "hotel_select_dates", pageKey: "/travel/hotel-detail", flowKey: "dates", description: "Date selection data available", severityIfFail: "warning", canAutoFix: false, scope: "hotel", steps: [{ key: "calendar_data", description: "Calendar has future dates" }] },
  { key: "hotel_check_room_prices", pageKey: "/travel/hotel-detail", flowKey: "pricing", description: "Room pricing valid", severityIfFail: "critical", canAutoFix: false, scope: "hotel", steps: [{ key: "prices_positive", description: "Prices > 0" }] },
  { key: "hotel_render_rate_plans", pageKey: "/travel/hotel-detail", flowKey: "rates", description: "Rate plans render", severityIfFail: "warning", canAutoFix: false, scope: "hotel", steps: [{ key: "rate_plans_count", description: "Rate plans exist" }] },

  // ── FOOD ──
  { key: "food_open_shop", pageKey: "/marketplace", flowKey: "food_menu", description: "Food merchants with menus", severityIfFail: "critical", canAutoFix: false, scope: "marketplace", steps: [{ key: "food_merchants", description: "Food merchants exist" }] },
  { key: "food_menu_render", pageKey: "/marketplace/food", flowKey: "menu_render", description: "Menus render correctly", severityIfFail: "warning", canAutoFix: false, scope: "marketplace", steps: [{ key: "menu_data", description: "menu_items_json populated" }] },

  // ── WALLET ──
  { key: "wallet_open", pageKey: "/wallet", flowKey: "payment", description: "Wallet chain integrity", severityIfFail: "critical", canAutoFix: false, scope: "wallet", steps: [{ key: "wallets_exist", description: "wallet_accounts accessible" }, { key: "transactions_exist", description: "Transactions accessible" }] },
  { key: "wallet_payment_receipt_visibility", pageKey: "/wallet", flowKey: "receipts", description: "Payment receipts visible", severityIfFail: "warning", canAutoFix: false, scope: "wallet", steps: [{ key: "receipt_data", description: "Recent transactions have data" }] },

  // ── COCKPIT ──
  { key: "cockpit_open", pageKey: "/admin/engines", flowKey: "cockpit", description: "Engine cockpit loads", severityIfFail: "warning", canAutoFix: false, scope: "cockpit", steps: [{ key: "engines_count", description: "Engines registered" }, { key: "logs_exist", description: "Run logs exist" }] },

  // ── ONBOARDING ──
  { key: "onboarding_open", pageKey: "/onboarding", flowKey: "onboarding", description: "Onboarding profiles accessible", severityIfFail: "warning", canAutoFix: false, scope: "onboarding", steps: [{ key: "profiles_count", description: "Onboarding profiles exist" }] },
  { key: "onboarding_submit_check", pageKey: "/onboarding", flowKey: "submission", description: "Onboarding submission chain", severityIfFail: "warning", canAutoFix: false, scope: "onboarding", steps: [{ key: "pipeline_queue", description: "Pipeline queue accessible" }] },

  // ── MAP ──
  { key: "map_render_check", pageKey: "/map", flowKey: "map_render", description: "Map has geo data", severityIfFail: "warning", canAutoFix: false, scope: "global", steps: [{ key: "geo_merchants", description: "Merchants with coordinates" }] },

  // ── DATA INTEGRITY ──
  { key: "live_merchant_integrity", pageKey: "/marketplace", flowKey: "data_integrity", description: "Live merchants have required fields", severityIfFail: "critical", canAutoFix: true, scope: "global", steps: [{ key: "check_fields", description: "Required fields present" }, { key: "auto_hide", description: "Hide broken live merchants" }] },
  { key: "orphan_conversations", pageKey: "/orbit", flowKey: "data_integrity", description: "No orphan conversations", severityIfFail: "warning", canAutoFix: false, scope: "orbit", steps: [{ key: "participants_check", description: "All convs have participants" }] },
  { key: "notification_delivery", pageKey: "/notifications", flowKey: "notifications", description: "Notifications flowing", severityIfFail: "info", canAutoFix: false, scope: "global", steps: [{ key: "recent_notifs", description: "Recent notifications exist" }] },
];

export function getScenariosForScope(scope: string): ScenarioDefinition[] {
  if (scope === "full") return CANONICAL_SCENARIOS;
  return CANONICAL_SCENARIOS.filter(s => s.scope === scope || s.scope === "global");
}
