/**
 * useDeliveryDisputes — CRUD for delivery disputes
 * PASS77-H: Delivery Disputes Flow
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DeliveryDispute {
  id: string;
  job_id: string;
  org_id: string | null;
  raised_by: string;
  raised_by_role: string;
  reason: string;
  description: string | null;
  evidence_urls: string[] | null;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface RaiseDisputePayload {
  job_id: string;
  org_id: string;
  reason: string;
  description?: string;
  evidence_urls?: string[];
  raised_by_role: "seller" | "driver" | "buyer";
}

export function useDeliveryDisputes(orgId?: string) {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DeliveryDispute[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId || !user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("delivery_disputes")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      setDisputes((data as DeliveryDispute[]) || []);
    } catch (err) {
      console.error("[disputes] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const raiseDispute = useCallback(async (payload: RaiseDisputePayload) => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.from("delivery_disputes").insert({
      job_id: payload.job_id,
      org_id: payload.org_id,
      raised_by: user.id,
      raised_by_role: payload.raised_by_role,
      reason: payload.reason,
      description: payload.description || null,
      evidence_urls: payload.evidence_urls || null,
      status: "open",
    });
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const resolveDispute = useCallback(async (disputeId: string, resolution: string) => {
    const { error } = await supabase
      .from("delivery_disputes")
      .update({ status: "resolved", resolution, resolved_at: new Date().toISOString() })
      .eq("id", disputeId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const escalateDispute = useCallback(async (disputeId: string) => {
    const { error } = await supabase
      .from("delivery_disputes")
      .update({ status: "escalated" })
      .eq("id", disputeId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const getDisputesByJob = useCallback((jobId: string) => {
    return disputes.filter(d => d.job_id === jobId);
  }, [disputes]);

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === "open").length,
    escalated: disputes.filter(d => d.status === "escalated").length,
    resolved: disputes.filter(d => d.status === "resolved").length,
  };

  return { disputes, loading, stats, raiseDispute, resolveDispute, escalateDispute, getDisputesByJob, refresh };
}
