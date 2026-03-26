/**
 * Connector Registry — Central registry of all source connectors.
 */
import type { OnboardingConnector } from "./base.connector";
import type { Vertical } from "../types";
import { isSourceAllowed } from "../source-policy.engine";
import { officialWebConnector } from "./official-web.connector";
import { googleBusinessConnector } from "./google-business.connector";
import { deliverooConnector } from "./deliveroo.connector";
import { talabatConnector } from "./talabat.connector";
import { careemConnector } from "./careem.connector";
import { noonConnector } from "./noon.connector";
import { bookingConnector } from "./booking.connector";
import { expediaConnector } from "./expedia.connector";
import { govoyageConnector } from "./govoyage.connector";

export const CONNECTOR_REGISTRY: OnboardingConnector[] = [
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

export function getConnectorsForVertical(vertical: Vertical): OnboardingConnector[] {
  return CONNECTOR_REGISTRY.filter((c) => isSourceAllowed(vertical, c.source));
}

export function getConnector(sourceId: string): OnboardingConnector | undefined {
  return CONNECTOR_REGISTRY.find((c) => c.source === sourceId);
}
