/**
 * Governance Layer barrel.
 */
import type { GovernanceLayerOutput, QualityReport } from "../contracts";
import type { Vertical } from "../../types";
import { checkPolicy } from "./governance.policy.check";
import { evaluatePublishGateStrict } from "./governance.publish_gate.evaluate";
import { assignVisibility } from "./governance.visibility.assign";

export { checkPolicy } from "./governance.policy.check";
export { evaluatePublishGate, evaluatePublishGateStrict } from "./governance.publish_gate.evaluate";
export { assignVisibility } from "./governance.visibility.assign";

export function runGovernanceLayer(params: {
  entityId: string;
  vertical: Vertical;
  country: string | null;
  city: string | null;
  sourcesUsed: string[];
  quality: QualityReport;
  isClaimed: boolean;
  hasLogo?: boolean;
  hasCover?: boolean;
  lat?: number | null;
  lng?: number | null;
  cityBoundsCheck?: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxonomyConfidence?: number;
}): GovernanceLayerOutput {
  const policyCheck = checkPolicy({
    vertical: params.vertical,
    country: params.country,
    city: params.city,
    sourcesUsed: params.sourcesUsed,
    qualityScore: params.quality.globalScore,
  });

  const publishDecision = evaluatePublishGateStrict({
    entityId: params.entityId,
    quality: params.quality,
    policy: policyCheck,
    hasLogo: params.hasLogo,
    hasCover: params.hasCover,
    lat: params.lat,
    lng: params.lng,
    cityBoundsCheck: params.cityBoundsCheck,
    phone: params.phone,
    email: params.email,
    website: params.website,
    taxonomyConfidence: params.taxonomyConfidence,
  });

  const visibilityMode = assignVisibility({
    allowed: publishDecision.allowed,
    qualityScore: params.quality.globalScore,
    isClaimed: params.isClaimed,
  });

  const reasonLog = [
    `vertical=${params.vertical}`,
    `country=${params.country ?? "unknown"}`,
    `city=${params.city ?? "unknown"}`,
    `quality=${params.quality.globalScore}`,
    `visibility=${visibilityMode}`,
    `allowed=${publishDecision.allowed}`,
    ...publishDecision.reasons.map((r) => `reason: ${r}`),
  ];

  return { policyCheck, publishDecision, visibilityMode, reasonLog };
}
