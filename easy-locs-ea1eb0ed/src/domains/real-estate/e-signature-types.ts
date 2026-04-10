export type SignatureStatus = "pending" | "signed" | "declined" | "expired" | "cancelled";
export type SignerRole = "landlord" | "tenant" | "guarantor" | "witness" | "agent" | "notary";

export interface SignatureRequest {
  id: string;
  documentId: string;
  documentType: "lease" | "amendment" | "termination" | "inventory" | "receipt" | "power_of_attorney";
  leaseId?: string;
  propertyId: string;
  createdBy: string;
  status: SignatureStatus;
  signers: Signer[];
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Signer {
  id: string;
  userId: string;
  role: SignerRole;
  fullName: string;
  email: string;
  phone?: string;
  status: SignatureStatus;
  signedAt?: string;
  signatureData?: string;
  ipAddress?: string;
  deviceInfo?: string;
  order: number;
}

export interface SignatureAuditEntry {
  id: string;
  requestId: string;
  signerId: string;
  action: "viewed" | "signed" | "declined" | "reminded" | "expired";
  timestamp: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface SignatureConfig {
  requireAllSigners: boolean;
  signingOrder: "sequential" | "parallel";
  expirationDays: number;
  reminderIntervalHours: number;
  maxReminders: number;
  allowDecline: boolean;
  requireReason: boolean;
}

export const DEFAULT_SIGNATURE_CONFIG: SignatureConfig = {
  requireAllSigners: true,
  signingOrder: "sequential",
  expirationDays: 14,
  reminderIntervalHours: 48,
  maxReminders: 3,
  allowDecline: true,
  requireReason: true,
};

export function isSignatureComplete(request: SignatureRequest): boolean {
  return request.signers.every(s => s.status === "signed");
}

export function getNextSigner(request: SignatureRequest): Signer | undefined {
  if (request.status !== "pending") return undefined;
  const sorted = [...request.signers].sort((a, b) => a.order - b.order);
  return sorted.find(s => s.status === "pending");
}

export function canSign(request: SignatureRequest, userId: string, config: SignatureConfig = DEFAULT_SIGNATURE_CONFIG): boolean {
  if (request.status !== "pending") return false;
  if (new Date(request.expiresAt) < new Date()) return false;

  const signer = request.signers.find(s => s.userId === userId);
  if (!signer || signer.status !== "pending") return false;

  if (config.signingOrder === "sequential") {
    const next = getNextSigner(request);
    return next?.userId === userId;
  }

  return true;
}

export function computeSignatureProgress(request: SignatureRequest): {
  signed: number;
  total: number;
  percent: number;
  status: "not_started" | "in_progress" | "complete" | "expired" | "declined";
} {
  const total = request.signers.length;
  const signed = request.signers.filter(s => s.status === "signed").length;
  const declined = request.signers.some(s => s.status === "declined");
  const expired = new Date(request.expiresAt) < new Date();

  let status: "not_started" | "in_progress" | "complete" | "expired" | "declined" = "not_started";
  if (declined) status = "declined";
  else if (expired && signed < total) status = "expired";
  else if (signed === total) status = "complete";
  else if (signed > 0) status = "in_progress";

  return { signed, total, percent: total > 0 ? Math.round((signed / total) * 100) : 0, status };
}
