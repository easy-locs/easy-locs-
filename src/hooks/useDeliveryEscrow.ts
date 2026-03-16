/**
 * useDeliveryEscrow — Hook for delivery escrow payment lifecycle
 * PASS73-C: Escrow hold / release / refund
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EscrowPayment {
  id: string;
  job_id: string;
  org_id: string;
  payer_id: string;
  payee_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "held" | "released" | "refunded" | "disputed";
  held_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  release_reason: string | null;
  refund_reason: string | null;
  created_at: string;
}

export function useDeliveryEscrow() {
  const [loading, setLoading] = useState(false);
  const [escrow, setEscrow] = useState<EscrowPayment | null>(null);
  const { toast } = useToast();

  const invoke = useCallback(async (action: string, payload: Record<string, any>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
        body: { action, ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const holdFunds = useCallback(async (jobId: string) => {
    const data = await invoke("escrow_hold", { job_id: jobId });
    if (data?.escrow) setEscrow(data.escrow);
    toast({ title: "Fonds bloqués", description: `${data.escrow?.amount} ${data.escrow?.currency} en escrow` });
    return data;
  }, [invoke, toast]);

  const releaseFunds = useCallback(async (jobId: string, reason?: string) => {
    const data = await invoke("escrow_release", { job_id: jobId, reason });
    if (data?.success) {
      setEscrow(prev => prev ? { ...prev, status: "released", released_at: data.released_at } : null);
      toast({ title: "Fonds libérés", description: `${data.amount} transférés au livreur` });
    }
    return data;
  }, [invoke, toast]);

  const refundFunds = useCallback(async (jobId: string, reason?: string) => {
    const data = await invoke("escrow_refund", { job_id: jobId, reason });
    if (data?.success) {
      setEscrow(prev => prev ? { ...prev, status: "refunded", refunded_at: data.refunded_at } : null);
      toast({ title: "Fonds remboursés", description: `${data.amount} remboursés` });
    }
    return data;
  }, [invoke, toast]);

  const fetchStatus = useCallback(async (jobId: string) => {
    const data = await invoke("escrow_status", { job_id: jobId });
    setEscrow(data?.escrow || null);
    return data?.escrow;
  }, [invoke]);

  return { escrow, loading, holdFunds, releaseFunds, refundFunds, fetchStatus };
}
