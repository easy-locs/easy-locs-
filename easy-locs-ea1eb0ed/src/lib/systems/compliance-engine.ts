import { platformBus } from "@/lib/shared/platform-bus";

export type KYCLevel = "none" | "basic" | "standard" | "enhanced" | "full";
export type KYCStatus = "pending" | "submitted" | "in_review" | "approved" | "rejected" | "expired";
export type DocumentType = "national_id" | "passport" | "driving_license" | "residence_permit" | "trade_license" | "tax_certificate" | "bank_statement" | "utility_bill" | "selfie";
export type ComplianceRegion = "GCC" | "EU" | "AFRICA" | "US" | "APAC" | "LATAM";

export interface KYCRequirement {
  level: KYCLevel;
  requiredDocuments: DocumentType[];
  maxTransactionAmount: number | null;
  maxDailyVolume: number | null;
  canSell: boolean;
  canWithdraw: boolean;
  reviewPeriodDays: number;
}

export interface UserKYCState {
  userId: string;
  level: KYCLevel;
  status: KYCStatus;
  submittedDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  lastReviewedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
}

export interface TransactionLimit {
  kycLevel: KYCLevel;
  singleTransactionMax: number;
  dailyMax: number;
  monthlyMax: number;
  currency: string;
}

export interface AMLFlag {
  userId: string;
  transactionId: string;
  flagType: "high_value" | "rapid_succession" | "unusual_pattern" | "sanctioned_party" | "round_amount";
  severity: "low" | "medium" | "high" | "critical";
  autoBlocked: boolean;
  details: string;
  createdAt: number;
}

const KYC_REQUIREMENTS: KYCRequirement[] = [
  { level: "none", requiredDocuments: [], maxTransactionAmount: 100, maxDailyVolume: 200, canSell: false, canWithdraw: false, reviewPeriodDays: 0 },
  { level: "basic", requiredDocuments: ["selfie"], maxTransactionAmount: 1000, maxDailyVolume: 2000, canSell: false, canWithdraw: false, reviewPeriodDays: 365 },
  { level: "standard", requiredDocuments: ["national_id", "selfie"], maxTransactionAmount: 10000, maxDailyVolume: 25000, canSell: true, canWithdraw: true, reviewPeriodDays: 365 },
  { level: "enhanced", requiredDocuments: ["national_id", "selfie", "utility_bill"], maxTransactionAmount: 50000, maxDailyVolume: 100000, canSell: true, canWithdraw: true, reviewPeriodDays: 180 },
  { level: "full", requiredDocuments: ["passport", "selfie", "utility_bill", "bank_statement"], maxTransactionAmount: null, maxDailyVolume: null, canSell: true, canWithdraw: true, reviewPeriodDays: 90 },
];

const TRANSACTION_LIMITS: TransactionLimit[] = [
  { kycLevel: "none", singleTransactionMax: 100, dailyMax: 200, monthlyMax: 1000, currency: "AED" },
  { kycLevel: "basic", singleTransactionMax: 1000, dailyMax: 2000, monthlyMax: 10000, currency: "AED" },
  { kycLevel: "standard", singleTransactionMax: 10000, dailyMax: 25000, monthlyMax: 100000, currency: "AED" },
  { kycLevel: "enhanced", singleTransactionMax: 50000, dailyMax: 100000, monthlyMax: 500000, currency: "AED" },
  { kycLevel: "full", singleTransactionMax: Infinity, dailyMax: Infinity, monthlyMax: Infinity, currency: "AED" },
];

export function getKYCRequirement(level: KYCLevel): KYCRequirement {
  return KYC_REQUIREMENTS.find((r) => r.level === level) ?? KYC_REQUIREMENTS[0];
}

export function getTransactionLimits(level: KYCLevel): TransactionLimit {
  return TRANSACTION_LIMITS.find((l) => l.kycLevel === level) ?? TRANSACTION_LIMITS[0];
}

export function getMissingDocuments(submitted: DocumentType[], required: DocumentType[]): DocumentType[] {
  return required.filter((doc) => !submitted.includes(doc));
}

export function canPerformTransaction(kycLevel: KYCLevel, amount: number): { allowed: boolean; reason?: string } {
  const limits = getTransactionLimits(kycLevel);
  if (amount > limits.singleTransactionMax) {
    return { allowed: false, reason: `Transaction exceeds limit of ${limits.singleTransactionMax} ${limits.currency} for KYC level ${kycLevel}` };
  }
  return { allowed: true };
}

export function checkAMLFlags(
  amount: number,
  recentTransactions: Array<{ amount: number; timestamp: number }>
): AMLFlag[] {
  const flags: AMLFlag[] = [];
  if (amount >= 50000) {
    flags.push({
      userId: "", transactionId: "", flagType: "high_value", severity: "high",
      autoBlocked: amount >= 200000, details: `High value transaction: ${amount}`, createdAt: Date.now(),
    });
  }
  const last30Min = recentTransactions.filter((t) => Date.now() - t.timestamp < 1800000);
  if (last30Min.length >= 5) {
    flags.push({
      userId: "", transactionId: "", flagType: "rapid_succession", severity: "medium",
      autoBlocked: false, details: `${last30Min.length} transactions in 30 minutes`, createdAt: Date.now(),
    });
  }
  if (amount >= 1000 && amount % 1000 === 0) {
    flags.push({
      userId: "", transactionId: "", flagType: "round_amount", severity: "low",
      autoBlocked: false, details: `Round amount: ${amount}`, createdAt: Date.now(),
    });
  }
  return flags;
}

export function isKYCExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function emitKYCStatusChanged(userId: string, status: KYCStatus, level: KYCLevel): void {
  platformBus.emit("kyc:status_changed", {
    userId, status, level, timestamp: Date.now(),
  }, "compliance-engine");
}

export function emitAMLAlert(flag: AMLFlag): void {
  platformBus.emit("compliance:aml_alert", {
    ...flag, timestamp: Date.now(),
  }, "compliance-engine");
  if (flag.severity === "critical" || flag.autoBlocked) {
    platformBus.emit("notification:created", {
      recipientId: "admin",
      type: "aml_critical",
      title: "Critical AML Alert",
      body: flag.details,
      route: "/admin/compliance",
    }, "compliance-engine");
  }
}

export function getGDPRExportableFields(): string[] {
  return [
    "profile", "email", "phone", "addresses", "orders", "transactions",
    "messages", "reviews", "listings", "preferences", "login_history",
  ];
}

export function getDataRetentionPolicy(): Record<string, number> {
  return {
    transactions: 7 * 365,
    messages: 2 * 365,
    login_history: 365,
    search_history: 90,
    analytics_events: 365,
    deleted_accounts: 30,
  };
}
