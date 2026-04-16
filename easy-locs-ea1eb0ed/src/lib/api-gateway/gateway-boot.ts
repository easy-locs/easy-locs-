import { registerConnector } from "./connector-registry";
import {
  dldConnector,
  deliverooConnector,
  talabatConnector,
  careemConnector,
  weatherConnector,
  newsConnector,
  forexConnector,
  prayerTimesConnector,
} from "./connectors";
import { orchestrationEngine } from "./orchestration-engine";
import { initIntelligenceBridge } from "./intelligence-bridge";
import { platformBus } from "@/lib/shared/platform-bus";

let booted = false;
let cleanupBridge: (() => void) | null = null;

export function bootApiGateway(): void {
  if (booted) return;

  registerConnector(dldConnector);
  registerConnector(deliverooConnector);
  registerConnector(talabatConnector);
  registerConnector(careemConnector);
  registerConnector(weatherConnector);
  registerConnector(newsConnector);
  registerConnector(forexConnector);
  registerConnector(prayerTimesConnector);

  cleanupBridge = initIntelligenceBridge();

  orchestrationEngine.initialize();

  ingestConnectorsIntoOmega();

  booted = true;
}

export function shutdownApiGateway(): void {
  if (!booted) return;

  orchestrationEngine.shutdown();

  if (cleanupBridge) {
    cleanupBridge();
    cleanupBridge = null;
  }

  booted = false;
}

export function isGatewayBooted(): boolean {
  return booted;
}

function ingestConnectorsIntoOmega(): void {
  try {
    const connectorNames = [
      "dld_transactions", "deliveroo_partner", "talabat_partner", "careem_partner",
      "openmeteo_weather", "google_news_rss", "frankfurter_forex", "aladhan_prayer_times",
    ];

    for (const name of connectorNames) {
      platformBus.emit(
        "system:intelligence_data_ingested",
        {
          source: "api_gateway_boot",
          connectorId: name,
          domain: "registration",
          recordCount: 0,
          timestamp: Date.now(),
        },
        "system"
      );
    }

    platformBus.emit(
      "system:gateway_omega_sync",
      {
        connectorCount: connectorNames.length,
        registeredAt: Date.now(),
      },
      "system"
    );
  } catch {
    // Omega integration is non-blocking
  }
}
