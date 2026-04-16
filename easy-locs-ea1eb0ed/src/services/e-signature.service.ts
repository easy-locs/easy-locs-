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

interface EnvelopeRow {
  id: string;
  lease_id: string;
  title: string;
  document_url: string;
  status: string;
  parties: SigningParty[];
  signed_document_url: string | null;
  user_id: string;
  created_at: string;
  expires_at: string;
}

function rowToEnvelope(row: EnvelopeRow): SigningEnvelope {
  return {
    id: row.id,
    leaseId: row.lease_id,
    title: row.title,
    documentUrl: row.document_url,
    status: row.status as SignatureStatus,
    parties: row.parties,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    signedDocumentUrl: row.signed_document_url ?? undefined,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function createSigningEnvelope(
  options: CreateEnvelopeOptions,
): Promise<{ ok: boolean; envelope?: SigningEnvelope; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data: fnData, error: fnError } = await db.functions.invoke("esign-create-envelope", {
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
  if (fnError) {
    return { ok: false, error: "Failed to create signing envelope. Please try again." };
  }

  const envelopeId = fnData?.envelopeId || `env_${crypto.randomUUID()}`;
  const parties: SigningParty[] = [
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
  ];

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await db
    .from("signature_envelopes")
    .insert({
      id: envelopeId,
      lease_id: options.leaseId,
      title: options.title,
      document_url: options.documentUrl,
      status: "pending",
      parties: parties as unknown as Record<string, unknown>,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Failed to persist signing envelope" };
  }

  return { ok: true, envelope: rowToEnvelope(data as unknown as EnvelopeRow) };
}

export async function signDocument(
  envelopeId: string,
  partyId: string,
  signatureDataUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error: fnError } = await db.functions.invoke("esign-create-envelope", {
    body: {
      action: "sign_document",
      envelopeId,
      partyId,
      userId,
      signatureData: signatureDataUrl,
    },
  });
  if (fnError) {
    return { ok: false, error: "Failed to submit signature to server" };
  }

  const { data: rpcResult, error: rpcError } = await db.rpc("sign_envelope_party", {
    p_envelope_id: envelopeId,
    p_party_id: partyId,
    p_signature_url: signatureDataUrl,
  });

  if (rpcError) return { ok: false, error: "Failed to update envelope" };

  const result = rpcResult as unknown as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true };
}

export async function getEnvelope(envelopeId: string): Promise<SigningEnvelope | null> {
  const { data } = await db
    .from("signature_envelopes")
    .select("*")
    .eq("id", envelopeId)
    .single();

  if (!data) return null;
  return rowToEnvelope(data as unknown as EnvelopeRow);
}

export async function getEnvelopesForLease(leaseId: string): Promise<SigningEnvelope[]> {
  const { data } = await db
    .from("signature_envelopes")
    .select("*")
    .eq("lease_id", leaseId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row: unknown) => rowToEnvelope(row as EnvelopeRow));
}

export async function getMyEnvelopes(): Promise<SigningEnvelope[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { data: fnData, error: fnError } = await db.functions.invoke("esign-create-envelope", {
      body: { action: "get_envelope_status", userId },
    });
    if (!fnError && fnData?.envelopes) return fnData.envelopes;
    if (fnError) {
      console.warn("[e-signature] Edge function failed, falling back to database query:", fnError.message ?? fnError);
    }
  } catch (err) {
    console.warn("[e-signature] Edge function unavailable, falling back to database query:", err instanceof Error ? err.message : "unknown");
  }

  const { data, error } = await db
    .from("signature_envelopes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch signing envelopes: ${error.message}`);
  }

  return (data ?? []).map((row: unknown) => rowToEnvelope(row as EnvelopeRow));
}

export async function declineEnvelope(
  envelopeId: string,
  partyId: string,
  _reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error: fnError } = await db.functions.invoke("esign-create-envelope", {
    body: { action: "decline_document", envelopeId, partyId, userId },
  });
  if (fnError) {
    return { ok: false, error: "Failed to decline envelope on server" };
  }

  const { data: rpcResult, error: rpcError } = await db.rpc("decline_envelope_party", {
    p_envelope_id: envelopeId,
    p_party_id: partyId,
  });

  if (rpcError) return { ok: false, error: "Failed to update envelope" };

  const result = rpcResult as unknown as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true };
}

export function getSigningUrl(envelopeId: string, partyId: string): string {
  return `/lease/sign/${envelopeId}?party=${partyId}`;
}
