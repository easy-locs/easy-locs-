/**
 * Connector Registry — Central registry of all source connectors.
 * Used by the orchestrator to resolve which connectors to use per vertical.
 */
import type { SourceConnector } from "./connector.interface";
import { deliverooConnector } from "./deliveroo.connector";
import { talabatConnector } from "./talabat.connector";
import { careemConnector } from "./careem.connector";
import { noonConnector } from "./noon.connector";
import { bookingConnector } from "./booking.connector";
import { expediaConnector } from "./expedia.connector";
import { govoyageConnector } from "./govoyage.connector";
import { officialWebConnector } from "./official-web.connector";
import { googleBusinessConnector } from "./google-business.connector";
import type { OnboardingVertical } from "../source-policy.engine";
import { isSourceAllowed } from "../source-policy.engine";

const ALL_CONNECTORS: SourceConnector[] = [
  deliverooConnector,
  talabatConnector,
  careemConnector,
  noonConnector,
  bookingConnector,
  expediaConnector,
  govoyageConnector,
  officialWebConnector,
  googleBusinessConnector,
];

/** Get all connectors allowed for a specific vertical */
export function getConnectorsForVertical(vertical: OnboardingVertical): SourceConnector[] {
  return ALL_CONNECTORS.filter(
    (c) => c.supportedVerticals.includes(vertical) && isSourceAllowed(vertical, c.sourceId)
  );
}

/** Get a specific connector by source ID */
export function getConnector(sourceId: string): SourceConnector | undefined {
  return ALL_CONNECTORS.find((c) => c.sourceId === sourceId);
}

/** Get all registered connector IDs */
export function getAllConnectorIds(): string[] {
  return ALL_CONNECTORS.map((c) => c.sourceId);
}
