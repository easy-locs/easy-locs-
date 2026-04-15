import { registerProvider, getProvider } from "./provider-adapter";
import { openMeteoProvider } from "./weather-provider-openmeteo";
import { frankfurterProvider } from "./forex-provider-frankfurter";
import { weatherProviderStub } from "./weather-provider-stub";
import { forexProviderStub } from "./forex-provider-stub";
import { prayerTimesProvider } from "./prayer-times-provider";
import { googleNewsProvider } from "./news-provider";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";
import { isFeatureEnabled } from "@/lib/control-plane/kill-switches";
import { runShadowValidation } from "./shadow-validation";
import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

const SHADOW_FLAG: PlatformFlag = "enable_intelligence_shadow_validation";

let booted = false;

export function bootProviders(): void {
  if (booted) return;

  if (!getProvider(openMeteoProvider.meta.id)) {
    registerProvider(openMeteoProvider);
  }
  if (!getProvider(frankfurterProvider.meta.id)) {
    registerProvider(frankfurterProvider);
  }
  if (!getProvider(weatherProviderStub.meta.id)) {
    registerProvider(weatherProviderStub);
  }
  if (!getProvider(forexProviderStub.meta.id)) {
    registerProvider(forexProviderStub);
  }
  if (!getProvider(prayerTimesProvider.meta.id)) {
    registerProvider(prayerTimesProvider);
  }
  if (!getProvider(googleNewsProvider.meta.id)) {
    registerProvider(googleNewsProvider);
  }

  booted = true;
}

export function executeShadowValidation(items: CanonicalGlobalFeedItem[]): void {
  if (!isPlatformFlagEnabled("enable_global_intelligence")) return;
  if (!isPlatformFlagEnabled(SHADOW_FLAG)) return;
  if (!isFeatureEnabled("intelligence_enabled")) return;

  try {
    const report = runShadowValidation(items);
    if (typeof console !== "undefined" && typeof console.debug === "function") {
      console.debug("[intelligence:shadow]", report);
    }
  } catch {
    // shadow validation must never throw — discard silently
  }
}
