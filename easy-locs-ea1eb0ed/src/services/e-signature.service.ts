import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export type SignatureStatus = "draft" | "pending" | "signed" | "declined" | "expired";

export interface SigningParty {
  id: string;
  name: string;
  email: string;
  role: "landlord" | "tenant";
  status: SignatureStatus;
  signedAt?: string;
  signatureUrl?: string;
}

export interface SigningEnvelope {
  id: string;
  leaseId: string;
  title: string;
  documentUrl: string;
  status: SignatureStatus;
  parties: SigningParty[];
  createdAt: string;
  expiresAt: string;
  signedDocumentUrl?: string;
}

export interface CreateEnvelopeOptions {
  leaseId: string;
  title: string;
  documentUrl: string;
  landlord: { name: string; email: string };
  tenant: { name: string; email: string };
}

const envelopeStore = new Map<string, SigningEnvelope>();

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function createSigningEnvelope(
  options: CreateEnvelopeOptions,
): Promise<{ ok: boolean; envelope?: SigningEnvelope; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data, error } = await db.functions.invoke("esign-create-envelope", {
    body: {
      action: "create_lease_envelope",
      leaseId: options.leaseId,
      title: options.title,
      documentUrl: options.documentUrl,
      landlordEmail: options.landlord.email,
      landlordName: options.landlord.name,
      tenantEmail: options.tenant.email,
      tenantName: options.tenant.name,
    },
  });
  if (error) {
    return { ok: false, error: "Failed to create signing envelope. Please try again." };
  }

  const envelope: SigningEnvelope = {
    id: data.envelopeId || `env_${crypto.randomUUID()}`,
    leaseId: options.leaseId,
    title: options.title,
    documentUrl: options.documentUrl,
    status: "pending",
    parties: [
      {
        id: `party_${crypto.randomUUID()}`,
        name: options.landlord.name,
        email: options.landlord.email,
        role: "landlord",
        status: "pending",
      },
      {
        id: `party_${crypto.randomUUID()}`,
        name: options.tenant.name,
        email: options.tenant.email,
        role: "tenant",
        status: "pending",
      },
    ],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  envelopeStore.set(envelope.id, envelope);
  return { ok: true, envelope };
}

export async function signDocument(
  envelopeId: string,
  partyId: string,
  signatureDataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const envelope = envelopeStore.get(envelopeId);
  if (!envelope) return { ok: false, error: "Envelope not found" };

  const party = envelope.parties.find((p) => p.id === partyId);
  if (!party) return { ok: false, error: "Party not found" };
  if (party.status === "signed") return { ok: false, error: "Already signed" };

  const { error } = await db.functions.invoke("esign-create-envelope", {
    body: {
      action: "sign_document",
      envelopeId,
      partyId,
      userId,
      signatureData: signatureDataUrl,
    },
  });
  if (error) {
    return { ok: false, error: "Failed to submit signature to server" };
  }

  party.status = "signed";
  party.signedAt = new Date().toISOString();
  party.signatureUrl = signatureDataUrl;

  const allSigned = envelope.parties.every((p) => p.status === "signed");
  if (allSigned) {
    envelope.status = "signed";
    envelope.signedDocumentUrl = envelope.documentUrl;
  }

  return { ok: true };
}

export async function getEnvelope(envelopeId: string): Promise<SigningEnvelope | null> {
  return envelopeStore.get(envelopeId) ?? null;
}

export async function getEnvelopesForLease(leaseId: string): Promise<SigningEnvelope[]> {
  const results: SigningEnvelope[] = [];
  for (const env of envelopeStore.values()) {
    if (env.leaseId === leaseId) results.push(env);
  }
  return results;
}

export async function getMyEnvelopes(): Promise<SigningEnvelope[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { data } = await db.functions.invoke("esign-create-envelope", {
      body: { action: "get_envelope_status", userId },
    });
    if (data?.envelopes) return data.envelopes;
  } catch {
    // fall through to local cache
  }

  return Array.from(envelopeStore.values());
}

export async function declineEnvelope(
  envelopeId: string,
  partyId: string,
  _reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const envelope = envelopeStore.get(envelopeId);
  if (!envelope) return { ok: false, error: "Envelope not found" };

  const party = envelope.parties.find((p) => p.id === partyId);
  if (!party) return { ok: false, error: "Party not found" };

  const { error } = await db.functions.invoke("esign-create-envelope", {
    body: { action: "decline_document", envelopeId, partyId, userId },
  });
  if (error) {
    return { ok: false, error: "Failed to decline envelope on server" };
  }

  party.status = "declined";
  envelope.status = "declined";

  return { ok: true };
}

export function getSigningUrl(envelopeId: string, partyId: string): string {
  return `/lease/sign/${envelopeId}?party=${partyId}`;
}
