/**
 * escrow.repository — Edge function calls for escrow delivery validation.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchEscrowStatus(jobId: string) {
  const { data } = await supabase.functions.invoke("dispatch-delivery", {
    body: { action: "escrow_status", job_id: jobId },
  });
  return data;
}

export async function confirmDelivery(jobId: string, confirmationCode: string, gps?: { lat?: number; lng?: number; accuracy?: number }) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
    body: {
      action: "confirm_delivery",
      job_id: jobId,
      confirmation_code: confirmationCode,
      gps_lat: gps?.lat,
      gps_lng: gps?.lng,
      gps_accuracy: gps?.accuracy,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function releaseEscrow(jobId: string, reason: string) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
    body: { action: "escrow_release", job_id: jobId, reason },
  });
  if (error) throw error;
  return data;
}

export async function refundEscrow(jobId: string, reason: string) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
    body: { action: "escrow_refund", job_id: jobId, reason },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
