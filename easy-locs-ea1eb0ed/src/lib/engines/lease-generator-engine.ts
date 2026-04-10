import type { Lease, Property, Tenant, PropertyAddress } from "@/domains/real-estate/canonical-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";
import {
  getCountryRules, computeDeposit, getLeaseTypes, getLegalObligations,
  type LeaseCategory, type CountryPropertyRules,
} from "@/domains/real-estate/country-rules";
import { platformBus } from "@/lib/shared/platform-bus";

export interface LeaseGeneratorInput {
  property: Property;
  tenant: Pick<Tenant, "id" | "name" | "email" | "phone">;
  landlordId: string;
  leaseCategory: LeaseCategory;
  startDate: string;
  durationMonths: number;
  monthlyRent: number;
  currency: CurrencyCode;
  paymentCycle: "monthly" | "quarterly" | "semi_annual" | "annual";
  includeCharges?: number;
  guarantorName?: string;
  customClauses?: string[];
}

export interface GeneratedLease {
  lease: Omit<Lease, "id" | "createdAt" | "updatedAt">;
  depositAmount: number;
  endDate: string;
  obligationsChecklist: { id: string; description: string; party: string; satisfied: boolean }[];
  warnings: string[];
  templateId: string;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function selectTemplate(countryCode: string, category: LeaseCategory): string {
  const base = countryCode.toLowerCase();
  const catMap: Record<LeaseCategory, string> = {
    empty: "lease-empty",
    furnished: "lease-furnished",
    commercial: "lease-commercial",
    seasonal: "lease-seasonal",
    professional: "lease-professional",
    rural: "lease-rural",
  };
  return `${base}/${catMap[category]}`;
}

function validateInput(input: LeaseGeneratorInput, rules: CountryPropertyRules): string[] {
  const warnings: string[] = [];
  const { contractRules: cr } = rules;

  if (cr.minLeaseDuration && input.durationMonths < cr.minLeaseDuration) {
    warnings.push(`Duration ${input.durationMonths}mo is below minimum ${cr.minLeaseDuration}mo for ${rules.countryCode}`);
  }
  if (cr.maxLeaseDuration && input.durationMonths > cr.maxLeaseDuration) {
    warnings.push(`Duration ${input.durationMonths}mo exceeds maximum ${cr.maxLeaseDuration}mo for ${rules.countryCode}`);
  }

  const allowedTypes = getLeaseTypes(rules.countryCode);
  if (!allowedTypes.includes(input.leaseCategory)) {
    warnings.push(`Lease type "${input.leaseCategory}" not standard in ${rules.countryCode}`);
  }

  if (input.guarantorName && !rules.guarantorAllowed) {
    warnings.push(`Guarantor not standard practice in ${rules.countryCode}`);
  }

  if (rules.insuranceMandatory) {
    warnings.push("Tenant insurance is mandatory — ensure proof is collected");
  }

  if (rules.diagnosticsMandatory) {
    warnings.push("Property diagnostics are mandatory — ensure all certificates are provided");
  }

  if (rules.inventoryRequired) {
    warnings.push("Inventory (état des lieux) is required at move-in and move-out");
  }

  return warnings;
}

export function generateLease(input: LeaseGeneratorInput): GeneratedLease {
  const countryCode = input.property.address.country;
  const rules = getCountryRules(countryCode);

  const depositAmount = computeDeposit(countryCode, input.monthlyRent);
  const endDate = addMonths(input.startDate, input.durationMonths);
  const warnings = validateInput(input, rules);

  const obligations = getLegalObligations(countryCode);
  const obligationsChecklist = obligations.map(o => ({
    id: o.id,
    description: o.description,
    party: o.party,
    satisfied: false,
  }));

  const templateId = selectTemplate(countryCode, input.leaseCategory);

  const lease: Omit<Lease, "id" | "createdAt" | "updatedAt"> = {
    propertyId: input.property.id,
    landlordId: input.landlordId,
    tenantId: input.tenant.id,
    startDate: input.startDate,
    endDate,
    rentAmount: input.monthlyRent,
    currency: input.currency,
    depositAmount,
    paymentCycle: input.paymentCycle,
    status: "draft",
    documentIds: [],
  };

  platformBus.emit("lease.generated", {
    propertyId: input.property.id,
    tenantId: input.tenant.id,
    countryCode,
    leaseCategory: input.leaseCategory,
    templateId,
    depositAmount,
    monthlyRent: input.monthlyRent,
  });

  return { lease, depositAmount, endDate, obligationsChecklist, warnings, templateId };
}

export interface LeaseRenewalResult {
  renewedLease: Omit<Lease, "id" | "createdAt" | "updatedAt">;
  rentAdjustment: { oldRent: number; newRent: number; increasePercent: number };
  warnings: string[];
}

export function generateLeaseRenewal(
  currentLease: Lease,
  newDurationMonths: number,
  countryCode: string,
  newRent?: number,
): LeaseRenewalResult {
  const rules = getCountryRules(countryCode);
  const warnings: string[] = [];

  const effectiveNewRent = newRent ?? currentLease.rentAmount;
  const increasePercent = currentLease.rentAmount > 0
    ? Math.round(((effectiveNewRent - currentLease.rentAmount) / currentLease.rentAmount) * 100 * 10) / 10
    : 0;

  if (rules.rentalLaw?.rentControlled && increasePercent > 10) {
    warnings.push(`Rent increase of ${increasePercent}% may exceed controlled limits in ${rules.countryCode}`);
  }

  const newStart = currentLease.endDate;
  const newEnd = addMonths(newStart, newDurationMonths);

  const renewedLease: Omit<Lease, "id" | "createdAt" | "updatedAt"> = {
    propertyId: currentLease.propertyId,
    landlordId: currentLease.landlordId,
    tenantId: currentLease.tenantId,
    startDate: newStart,
    endDate: newEnd,
    rentAmount: effectiveNewRent,
    currency: currentLease.currency,
    depositAmount: currentLease.depositAmount,
    paymentCycle: currentLease.paymentCycle,
    status: "draft",
    documentIds: [],
  };

  return {
    renewedLease,
    rentAdjustment: { oldRent: currentLease.rentAmount, newRent: effectiveNewRent, increasePercent },
    warnings,
  };
}
