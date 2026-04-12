import { structuredLogger } from "@/lib/observability/structured-logger";
import { platformBus, PLATFORM_EVENTS } from "@/lib/platform-bus";
import type { ControlDomain, KillSwitch } from "./types";

const killSwitches = new Map<string, KillSwitch>();

const DEFAULT_SWITCHES: { feature: string; domain: ControlDomain }[] = [
  { feature: "orbit_calls_enabled", domain: "orbit_call" },
  { feature: "wallet_payments_enabled", domain: "wallet" },
  { feature: "wallet_topup_enabled", domain: "wallet" },
  { feature: "qr_pay_enabled", domain: "payment" },
  { feature: "invisible_directory_pay_enabled", domain: "payment" },
  { feature: "scraping_import_enabled", domain: "scraping" },
  { feature: "media_upload_enabled", domain: "media" },
  { feature: "booking_checkout_enabled", domain: "booking" },
  { feature: "realtime_presence_enabled", domain: "realtime" },
  { feature: "provider_publish_enabled", domain: "listing" },
  { feature: "flight_booking_enabled", domain: "flights" },
  { feature: "radar_live_enabled", domain: "radar" },
  { feature: "food_ordering_enabled", domain: "food" },
  { feature: "hotel_booking_enabled", domain: "hotel" },
  { feature: "services_booking_enabled", domain: "services" },
  { feature: "property_management_enabled", domain: "property" },
  { feature: "otp_enabled", domain: "auth" },
  { feature: "contact_sync_enabled", domain: "identity" },
  { feature: "notifications_enabled", domain: "notification" },
  { feature: "intelligence_enabled", domain: "intelligence" },
  { feature: "local_commerce_enabled", domain: "local_commerce" },
];

const DISABLED_BY_DEFAULT: Set<string> = new Set([
  "intelligence_enabled",
  "local_commerce_enabled",
]);

function initDefaults(): void {
  for (const sw of DEFAULT_SWITCHES) {
    if (!killSwitches.has(sw.feature)) {
      killSwitches.set(sw.feature, {
        id: `ks_${sw.feature}`,
        domain: sw.domain,
        feature: sw.feature,
        enabled: !DISABLED_BY_DEFAULT.has(sw.feature),
        toggled_at: new Date().toISOString(),
        toggled_by: "system",
      });
    }
  }
}

initDefaults();

export function isFeatureEnabled(feature: string): boolean {
  const sw = killSwitches.get(feature);
  return sw ? sw.enabled : true;
}

export function toggleKillSwitch(
  feature: string,
  enabled: boolean,
  reason: string,
  toggled_by = "system"
): void {
  const existing = killSwitches.get(feature);
  if (!existing) {
    structuredLogger.warn("system", "kill_switch.unknown", `Unknown kill switch: ${feature}`);
    return;
  }

  const previousState = existing.enabled;
  existing.enabled = enabled;
  existing.reason = reason;
  existing.toggled_at = new Date().toISOString();
  existing.toggled_by = toggled_by;

  structuredLogger.warn(
    existing.domain as any,
    "kill_switch.toggled",
    `${feature}: ${previousState} → ${enabled} | Reason: ${reason}`,
    {
      payload_summary: { feature, enabled, reason, toggled_by },
    }
  );

  platformBus.emit(PLATFORM_EVENTS.SYSTEM_KILL_SWITCH_TOGGLED, "system", {
    feature,
    enabled,
    reason,
    domain: existing.domain,
  });
}

export function getKillSwitch(feature: string): KillSwitch | undefined {
  return killSwitches.get(feature);
}

export function getAllKillSwitches(): KillSwitch[] {
  return Array.from(killSwitches.values());
}

export function getDisabledFeatures(): KillSwitch[] {
  return Array.from(killSwitches.values()).filter((sw) => !sw.enabled);
}

export function emergencyShutdown(domain: ControlDomain, reason: string): string[] {
  const affected: string[] = [];
  for (const [feature, sw] of killSwitches) {
    if (sw.domain === domain && sw.enabled) {
      toggleKillSwitch(feature, false, `EMERGENCY: ${reason}`, "auto-protect");
      affected.push(feature);
    }
  }
  structuredLogger.critical(
    domain as any,
    "emergency_shutdown",
    `Emergency shutdown for ${domain}: ${affected.length} features disabled`,
    { payload_summary: { affected, reason } }
  );
  return affected;
}
