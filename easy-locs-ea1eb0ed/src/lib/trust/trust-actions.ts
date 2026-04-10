import { type SecurityFlag, SECURITY_FLAG_CONFIGS, type TrustLevel } from "./trust-levels";

export type TrustAction =
  | "allow"
  | "require_otp"
  | "reduce_limits"
  | "require_kyc"
  | "block_sensitive"
  | "freeze_wallet"
  | "flag_for_review"
  | "block_account"
  | "restrict_orbit"
  | "demote_radar";

export interface GraduatedResponse {
  flag: SecurityFlag;
  actions: TrustAction[];
  userMessage: string;
  userMessageKey: string;
  severity: "none" | "low" | "medium" | "high" | "critical";
  requiresUserAction: boolean;
}

export function computeGraduatedResponse(flag: SecurityFlag): GraduatedResponse {
  const config = SECURITY_FLAG_CONFIGS[flag];

  switch (flag) {
    case "normal":
      return {
        flag,
        actions: ["allow"],
        userMessage: "Your account is in good standing.",
        userMessageKey: "trust.status_normal",
        severity: "none",
        requiresUserAction: false,
      };

    case "low_risk":
      return {
        flag,
        actions: ["reduce_limits"],
        userMessage: "Some limits may be slightly reduced. Continue using the app normally to increase your trust level.",
        userMessageKey: "trust.status_low_risk",
        severity: "low",
        requiresUserAction: false,
      };

    case "suspicious":
      return {
        flag,
        actions: ["require_otp", "reduce_limits", "block_sensitive", "restrict_orbit"],
        userMessage: "We noticed unusual activity. Some actions require additional verification.",
        userMessageKey: "trust.status_suspicious",
        severity: "medium",
        requiresUserAction: true,
      };

    case "review_required":
      return {
        flag,
        actions: ["require_otp", "reduce_limits", "require_kyc", "block_sensitive", "flag_for_review", "restrict_orbit", "demote_radar"],
        userMessage: "Your account is under review. Please complete verification to restore full access.",
        userMessageKey: "trust.status_review",
        severity: "high",
        requiresUserAction: true,
      };

    case "high_risk":
      return {
        flag,
        actions: ["require_otp", "reduce_limits", "require_kyc", "block_sensitive", "flag_for_review", "restrict_orbit", "demote_radar"],
        userMessage: "Your account has been flagged for security review. Verification is required.",
        userMessageKey: "trust.status_high_risk",
        severity: "high",
        requiresUserAction: true,
      };

    case "restricted":
      return {
        flag,
        actions: ["require_otp", "freeze_wallet", "require_kyc", "block_sensitive", "flag_for_review", "restrict_orbit", "demote_radar"],
        userMessage: "Your account is restricted. Transactions are temporarily suspended pending review.",
        userMessageKey: "trust.status_restricted",
        severity: "critical",
        requiresUserAction: true,
      };

    case "blocked":
      return {
        flag,
        actions: ["block_account", "freeze_wallet", "restrict_orbit", "demote_radar"],
        userMessage: "Your account has been suspended. Contact support for assistance.",
        userMessageKey: "trust.status_blocked",
        severity: "critical",
        requiresUserAction: true,
      };
  }
}

export function shouldRequireOtp(flag: SecurityFlag, action: string): boolean {
  const config = SECURITY_FLAG_CONFIGS[flag];
  if (!config.requireOtp) return false;

  const sensitiveActions = [
    "wallet_transfer", "wallet_topup", "payment", "pin_change",
    "device_change", "phone_change", "kyc_submit", "session_revoke",
    "send", "topup", "request", "receive",
  ];
  return sensitiveActions.includes(action);
}

export function getMaxRetriesForFlag(flag: SecurityFlag): number {
  switch (flag) {
    case "normal": return 5;
    case "low_risk": return 4;
    case "suspicious": return 3;
    case "review_required": return 2;
    case "high_risk": return 2;
    case "restricted": return 1;
    case "blocked": return 0;
  }
}

export function canUpgradeLevel(currentLevel: TrustLevel, flag: SecurityFlag, kycCompleted: boolean): boolean {
  if (flag === "blocked" || flag === "restricted") return false;
  if (flag === "high_risk" || flag === "review_required") return false;
  if (currentLevel >= 3 && !kycCompleted) return false;
  return true;
}

export function getEscalationPath(flag: SecurityFlag): SecurityFlag | null {
  const escalation: Partial<Record<SecurityFlag, SecurityFlag>> = {
    normal: "low_risk",
    low_risk: "suspicious",
    suspicious: "review_required",
    review_required: "high_risk",
    high_risk: "restricted",
    restricted: "blocked",
  };
  return escalation[flag] ?? null;
}

export function getDeescalationPath(flag: SecurityFlag): SecurityFlag | null {
  const deescalation: Partial<Record<SecurityFlag, SecurityFlag>> = {
    blocked: "restricted",
    restricted: "high_risk",
    high_risk: "review_required",
    review_required: "suspicious",
    suspicious: "low_risk",
    low_risk: "normal",
  };
  return deescalation[flag] ?? null;
}
