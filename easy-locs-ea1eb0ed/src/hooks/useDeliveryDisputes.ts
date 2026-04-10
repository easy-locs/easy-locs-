/**
 * useDeliveryDisputes — CRUD for delivery disputes.
 * CANONICAL: via mobility.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";

export interface DeliveryDispute {
  id: string; job_id: string; org_id: string | null; raised_by: string;
  raised_by_role: string; reason: string; description: string | null;
  evidence_urls: string[] | null; status: string; resolution: string | null;
  resolved_at: string | null; created_at: string | null;
}

export interface RaiseDisputePayload {
  job_id: string; org_id: string; reason: string; description?: string;
  evidence_urls?: string[]; raised_by_role: "seller" | "driver" | "buyer";
}

export function useDeliveryDisputes(orgId?: string) {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DeliveryDispute[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId || !user) return;
    setLoading(true);
    try {
      const data = await repo.fetchDeliveryDisputes(orgId);
      setDisputes(data as DeliveryDispute[]);
    } catch (err) {
      console.error("[disputes] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const raiseDispute = useCallback(async (payload: RaiseDisputePayload) => {
    if (!user) throw new Error("Not authenticated");
    await repo.insertDeliveryDispute({
      job_id: payload.job_id, org_id: payload.org_id, raised_by: user.id,
      raised_by_role: payload.raised_by_role, reason: payload.reason,
      description: payload.description || null, evidence_urls: payload.evidence_urls || null, status: "open",
    });
    await refresh();
  }, [user, refresh]);

  const resolveDispute = useCallback(async (disputeId: string, resolution: string) => {
    await repo.updateDeliveryDispute(disputeId, { status: "resolved", resolution, resolved_at: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const escalateDispute = useCallback(async (disputeId: string) => {
    await repo.updateDeliveryDispute(disputeId, { status: "escalated" });
    await refresh();
  }, [refresh]);

  const getDisputesByJob = useCallback((jobId: string) => disputes.filter(d => d.job_id === jobId), [disputes]);

  const stats = { total: disputes.length, open: disputes.filter(d => d.status === "open").length, escalated: disputes.filter(d => d.status === "escalated").length, resolved: disputes.filter(d => d.status === "resolved").length };

  return { disputes, loading, stats, raiseDispute, resolveDispute, escalateDispute, getDisputesByJob, refresh };
}
