export type KycStatus =
  | "not_started"
  | "basic_info"
  | "selfie_pending"
  | "selfie_verified"
  | "document_pending"
  | "document_verified"
  | "fully_verified"
  | "rejected";

export interface KycProfile {
  status: KycStatus;
  level: number;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  selfieUrl: string | null;
  selfieVerifiedAt: string | null;
  documentType: string | null;
  documentVerifiedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface KycRequirement {
  step: string;
  stepKey: string;
  required: boolean;
  completed: boolean;
  description: string;
}

export function getKycLevel(status: KycStatus): number {
  switch (status) {
    case "not_started": return 0;
    case "basic_info": return 1;
    case "selfie_pending": return 1;
    case "selfie_verified": return 2;
    case "document_pending": return 2;
    case "document_verified": return 3;
    case "fully_verified": return 3;
    case "rejected": return 0;
    default: return 0;
  }
}

export function isKycCompleted(status: KycStatus): boolean {
  return status === "selfie_verified" || status === "document_verified" || status === "fully_verified";
}

export function getKycRequirements(
  currentStatus: KycStatus,
  targetTrustLevel: number
): KycRequirement[] {
  const requirements: KycRequirement[] = [];

  const hasBasicInfo = currentStatus !== "not_started" && currentStatus !== "rejected";
  const hasSelfie = currentStatus === "selfie_verified" || currentStatus === "document_verified" || currentStatus === "fully_verified";
  const hasDocument = currentStatus === "document_verified" || currentStatus === "fully_verified";

  requirements.push({
    step: "Basic Info",
    stepKey: "kyc.basicInfo",
    required: true,
    completed: hasBasicInfo,
    description: "First name, last name, date of birth",
  });

  if (targetTrustLevel >= 3) {
    requirements.push({
      step: "Selfie",
      stepKey: "kyc.selfie",
      required: true,
      completed: hasSelfie,
      description: "Quick selfie for identity confirmation",
    });
  }

  if (targetTrustLevel >= 4) {
    requirements.push({
      step: "Document",
      stepKey: "kyc.document",
      required: true,
      completed: hasDocument,
      description: "ID card, passport, or driving license",
    });
  }

  return requirements;
}

export function getKycProgress(status: KycStatus): {
  progress: number;
  stepsCompleted: number;
  totalSteps: number;
} {
  const steps = {
    not_started: { completed: 0, total: 3 },
    basic_info: { completed: 1, total: 3 },
    selfie_pending: { completed: 1, total: 3 },
    selfie_verified: { completed: 2, total: 3 },
    document_pending: { completed: 2, total: 3 },
    document_verified: { completed: 3, total: 3 },
    fully_verified: { completed: 3, total: 3 },
    rejected: { completed: 0, total: 3 },
  };

  const s = steps[status] || steps.not_started;
  return {
    progress: Math.round((s.completed / s.total) * 100),
    stepsCompleted: s.completed,
    totalSteps: s.total,
  };
}

export type KycTriggerReason =
  | "level_upgrade"
  | "high_volume"
  | "suspicious_activity"
  | "device_changes"
  | "manual_request";

export interface KycTrigger {
  required: boolean;
  reason: KycTriggerReason | null;
  minRequiredStatus: KycStatus;
  message: string;
}

export function evaluateKycTrigger(params: {
  currentStatus: KycStatus;
  completedPayments: number;
  moderationFlags: number;
  deviceChanges30d: number;
  targetLevel: number;
}): KycTrigger {
  const { currentStatus, completedPayments, moderationFlags, deviceChanges30d, targetLevel } = params;

  if (targetLevel >= 3 && !isKycCompleted(currentStatus)) {
    return {
      required: true,
      reason: "level_upgrade",
      minRequiredStatus: "selfie_verified",
      message: "Complete identity verification to unlock higher limits",
    };
  }

  if (completedPayments > 20 && !isKycCompleted(currentStatus)) {
    return {
      required: true,
      reason: "high_volume",
      minRequiredStatus: "basic_info",
      message: "Verify your identity to continue making transactions",
    };
  }

  if (moderationFlags > 0 && !isKycCompleted(currentStatus)) {
    return {
      required: true,
      reason: "suspicious_activity",
      minRequiredStatus: "selfie_verified",
      message: "Additional verification required for account security",
    };
  }

  if (deviceChanges30d >= 2 && !isKycCompleted(currentStatus)) {
    return {
      required: true,
      reason: "device_changes",
      minRequiredStatus: "basic_info",
      message: "Verify your identity after device change",
    };
  }

  return {
    required: false,
    reason: null,
    minRequiredStatus: currentStatus,
    message: "",
  };
}

export function getDefaultKycProfile(): KycProfile {
  return {
    status: "not_started",
    level: 0,
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    selfieUrl: null,
    selfieVerifiedAt: null,
    documentType: null,
    documentVerifiedAt: null,
    rejectionReason: null,
    updatedAt: new Date().toISOString(),
  };
}
