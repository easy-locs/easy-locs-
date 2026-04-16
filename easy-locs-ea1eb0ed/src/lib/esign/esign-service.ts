import { callEdgeFunction } from "@/lib/edge-client";

export interface LeaseSignatureRequest {
  leaseId: string;
  documentUrl: string;
  landlordEmail: string;
  landlordName?: string;
  tenantEmail: string;
  tenantName?: string;
  title?: string;
}

export interface SignerStatus {
  name: string;
  email: string;
  status: string;
  signedAt: string | null;
}

export interface EnvelopeStatus {
  envelopeId: string;
  status: string;
  signers: SignerStatus[];
}

export async function createLeaseEnvelope(
  request: LeaseSignatureRequest
): Promise<{ envelopeId: string; status: string }> {
  const data = await callEdgeFunction<{ envelopeId: string; status: string }>(
    "esign-create-envelope",
    { action: "create_lease_envelope", ...request }
  );
  return { envelopeId: data.envelopeId, status: data.status };
}

export async function getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus> {
  return callEdgeFunction<EnvelopeStatus>("esign-create-envelope", {
    action: "get_envelope_status",
    envelopeId,
  });
}

export async function downloadSignedDocument(
  envelopeId: string
): Promise<{ documentPath: string; downloadUrl: string | null }> {
  return callEdgeFunction("esign-create-envelope", {
    action: "download_signed",
    envelopeId,
  });
}

export function isEsignAvailable(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}
