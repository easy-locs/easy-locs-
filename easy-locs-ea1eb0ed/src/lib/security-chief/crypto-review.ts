import type { BackendSecurityContract, AuditLevel } from "./types";

export async function createCryptoReview(params: {
  backend: BackendSecurityContract;
  createdBy: string;
  scope: string;
  findings?: string[];
  auditLevel?: AuditLevel;
}) {
  return params.backend.submitReview({
    scope: params.scope,
    auditLevel: params.auditLevel ?? "external",
    createdBy: params.createdBy,
    findings: params.findings ?? [],
    status: "open",
  });
}

export async function requireCryptoChiefReview(params: {
  backend: BackendSecurityContract;
  createdBy: string;
  scope: string;
}) {
  return createCryptoReview({
    backend: params.backend,
    createdBy: params.createdBy,
    scope: params.scope,
    findings: [
      "Review key rotation",
      "Review replay protection",
      "Review device attestation",
      "Review signaling signature verification",
      "Review wallet isolation boundary",
      "Review TURN issuance policy",
    ],
    auditLevel: "formal-review",
  });
}
