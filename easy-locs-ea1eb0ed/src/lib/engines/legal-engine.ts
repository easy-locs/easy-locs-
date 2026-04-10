import type { Property } from "@/domains/real-estate/canonical-types";
import {
  getCountryRules, getLegalObligations, getRentalLaw, isESignatureSupported,
  type LegalObligation, type RentalLaw, type CountryPropertyRules,
} from "@/domains/real-estate/country-rules";
import { platformBus } from "@/lib/shared/platform-bus";

export type ComplianceStatus = "compliant" | "warning" | "non_compliant" | "unknown";

export interface ComplianceCheck {
  obligationId: string;
  description: string;
  party: string;
  mandatory: boolean;
  status: ComplianceStatus;
  details?: string;
  documentRequired?: string;
  documentProvided: boolean;
}

export interface ComplianceReport {
  propertyId: string;
  countryCode: string;
  overallStatus: ComplianceStatus;
  checks: ComplianceCheck[];
  score: number;
  maxScore: number;
  missingDocuments: string[];
  warnings: string[];
  rentalLaw: RentalLaw | undefined;
  generatedAt: string;
}

export interface LeaseComplianceResult {
  valid: boolean;
  issues: { field: string; message: string; severity: "error" | "warning" }[];
  countryRules: CountryPropertyRules;
}

export function runPropertyComplianceCheck(
  property: Property,
  providedDocumentTypes: string[],
): ComplianceReport {
  const countryCode = property.address.country;
  const rules = getCountryRules(countryCode);
  const obligations = getLegalObligations(countryCode);
  const rentalLaw = getRentalLaw(countryCode);

  const checks: ComplianceCheck[] = [];
  const missingDocuments: string[] = [];
  const warnings: string[] = [];

  for (const obligation of obligations) {
    const hasDocument = obligation.documentRequired
      ? providedDocumentTypes.includes(obligation.documentRequired)
      : true;

    let status: ComplianceStatus = "compliant";
    if (!hasDocument && obligation.mandatory) {
      status = "non_compliant";
      if (obligation.documentRequired) missingDocuments.push(obligation.documentRequired);
    } else if (!hasDocument && !obligation.mandatory) {
      status = "warning";
    }

    checks.push({
      obligationId: obligation.id,
      description: obligation.description,
      party: obligation.party,
      mandatory: obligation.mandatory,
      status,
      documentRequired: obligation.documentRequired,
      documentProvided: hasDocument,
    });
  }

  for (const reqDoc of rules.requiredDocuments) {
    if (!providedDocumentTypes.includes(reqDoc)) {
      missingDocuments.push(reqDoc);
      checks.push({
        obligationId: `doc_${reqDoc}`,
        description: `Required document: ${reqDoc}`,
        party: "landlord",
        mandatory: true,
        status: "non_compliant",
        documentRequired: reqDoc,
        documentProvided: false,
      });
    }
  }

  if (rules.insuranceMandatory && !providedDocumentTypes.includes("insurance")) {
    warnings.push("Tenant insurance is mandatory but not provided");
    missingDocuments.push("insurance");
  }

  if (rules.diagnosticsMandatory && !providedDocumentTypes.includes("energy_certificate")) {
    warnings.push("Energy diagnostics certificate is mandatory but not provided");
  }

  const mandatoryChecks = checks.filter(c => c.mandatory);
  const passedMandatory = mandatoryChecks.filter(c => c.status === "compliant").length;
  const score = mandatoryChecks.length > 0 ? Math.round((passedMandatory / mandatoryChecks.length) * 100) : 100;

  let overallStatus: ComplianceStatus = "compliant";
  if (checks.some(c => c.status === "non_compliant" && c.mandatory)) overallStatus = "non_compliant";
  else if (checks.some(c => c.status === "warning")) overallStatus = "warning";

  const report: ComplianceReport = {
    propertyId: property.id,
    countryCode,
    overallStatus,
    checks,
    score,
    maxScore: 100,
    missingDocuments: [...new Set(missingDocuments)],
    warnings,
    rentalLaw,
    generatedAt: new Date().toISOString(),
  };

  platformBus.emit("compliance.report_generated", {
    propertyId: property.id,
    landlordId: (property as Record<string, unknown>).landlordId ?? "unknown",
    countryCode,
    overallStatus,
    score,
    missingCount: missingDocuments.length,
  });

  return report;
}

export function validateLeaseCompliance(
  countryCode: string,
  leaseData: {
    durationMonths: number;
    depositAmount: number;
    monthlyRent: number;
    leaseCategory: string;
    startDate: string;
  },
): LeaseComplianceResult {
  const rules = getCountryRules(countryCode);
  const issues: LeaseComplianceResult["issues"] = [];

  const { contractRules: cr } = rules;

  if (cr.minLeaseDuration && leaseData.durationMonths < cr.minLeaseDuration) {
    issues.push({
      field: "durationMonths",
      message: `Minimum lease duration is ${cr.minLeaseDuration} months in ${rules.countryName}`,
      severity: "error",
    });
  }

  if (cr.maxLeaseDuration && leaseData.durationMonths > cr.maxLeaseDuration) {
    issues.push({
      field: "durationMonths",
      message: `Maximum lease duration is ${cr.maxLeaseDuration} months in ${rules.countryName}`,
      severity: "error",
    });
  }

  const expectedDeposit = leaseData.monthlyRent * (cr.depositMultiplier ?? 1);
  if (leaseData.depositAmount > expectedDeposit * 1.1) {
    issues.push({
      field: "depositAmount",
      message: `Deposit exceeds legal maximum of ${cr.depositMultiplier ?? 1} month(s) rent in ${rules.countryName}`,
      severity: "error",
    });
  }

  if (!rules.leaseTypes.includes(leaseData.leaseCategory as any)) {
    issues.push({
      field: "leaseCategory",
      message: `Lease type "${leaseData.leaseCategory}" is not standard in ${rules.countryName}`,
      severity: "warning",
    });
  }

  if (rules.rentalLaw?.rentControlled) {
    issues.push({
      field: "monthlyRent",
      message: `Rent control applies in ${rules.countryName}: ${rules.rentalLaw.rentIncreaseRule ?? "check local regulations"}`,
      severity: "warning",
    });
  }

  return {
    valid: issues.filter(i => i.severity === "error").length === 0,
    issues,
    countryRules: rules,
  };
}

export function getSignatureRequirements(countryCode: string): {
  eSignatureAllowed: boolean;
  witnessRequired: boolean;
  notarizationRequired: boolean;
  registrationRequired: boolean;
  registrationDeadlineDays?: number;
} {
  const rules = getCountryRules(countryCode);
  const obligations = getLegalObligations(countryCode);

  const registrationObligation = obligations.find(o =>
    o.id.includes("registration") || o.id.includes("ejari") || o.id.includes("ejar"),
  );

  return {
    eSignatureAllowed: isESignatureSupported(countryCode),
    witnessRequired: ["IN", "EG"].includes(countryCode),
    notarizationRequired: ["EG", "TN"].includes(countryCode),
    registrationRequired: !!registrationObligation,
    registrationDeadlineDays: countryCode === "AE" ? 14 : countryCode === "ES" ? 30 : undefined,
  };
}
