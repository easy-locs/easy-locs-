import type {
  BackendSecurityContract,
  DeviceAttestationRecord,
  HardenedRtcConfig,
  SecurityReviewRecord,
  SecurityDomain,
} from "./types";
import { supabase } from "@/integrations/supabase/client";

export class SupabaseBackendSecurityContract implements BackendSecurityContract {
  async submitReview(record: Omit<SecurityReviewRecord, "id" | "createdAt">): Promise<SecurityReviewRecord> {
    const payload = {
      scope: record.scope,
      audit_level: record.auditLevel,
      created_by: record.createdBy,
      findings: record.findings,
      status: record.status,
    };

    const { data, error } = await (supabase as any)
      .from("security_reviews")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      scope: data.scope,
      auditLevel: data.audit_level,
      createdAt: data.created_at,
      createdBy: data.created_by,
      findings: data.findings ?? [],
      status: data.status,
    };
  }

  async registerDeviceAttestation(record: DeviceAttestationRecord): Promise<void> {
    const { error } = await (supabase as any)
      .from("device_attestations")
      .upsert({
        device_id: record.deviceId,
        device_fingerprint: record.deviceFingerprint,
        public_key_fingerprint: record.publicKeyFingerprint,
        first_seen_at: record.firstSeenAt,
        last_seen_at: record.lastSeenAt,
        revoked_at: record.revokedAt,
        trust_state: record.trustState,
      }, { onConflict: "device_id" });

    if (error) throw error;
  }

  async fetchTrustedDevice(deviceId: string): Promise<DeviceAttestationRecord | null> {
    const { data, error } = await (supabase as any)
      .from("device_attestations")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      deviceId: data.device_id,
      deviceFingerprint: data.device_fingerprint,
      publicKeyFingerprint: data.public_key_fingerprint,
      firstSeenAt: data.first_seen_at,
      lastSeenAt: data.last_seen_at,
      revokedAt: data.revoked_at,
      trustState: data.trust_state,
    };
  }

  async consumeNonce(nonce: string, domain: SecurityDomain): Promise<boolean> {
    const { data: existing } = await (supabase as any)
      .from("security_nonces")
      .select("id")
      .eq("nonce", nonce)
      .eq("domain", domain)
      .maybeSingle();

    if (existing) return false;

    const { error } = await (supabase as any)
      .from("security_nonces")
      .insert({
        nonce,
        domain,
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      });

    if (error) return false;
    return true;
  }

  async issueTurnConfig(): Promise<HardenedRtcConfig> {
    const FALLBACK: HardenedRtcConfig = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    };

    try {
      const { data, error } = await supabase.functions.invoke("get-turn-credentials");
      if (error || !data?.iceServers) return FALLBACK;
      return {
        iceServers: data.iceServers,
        iceTransportPolicy: data.iceTransportPolicy ?? "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      };
    } catch {
      return FALLBACK;
    }
  }
}
