/**
 * Delivery proof — photo, signature, geo confirmation for completed deliveries.
 */
import { supabase } from "@/integrations/supabase/client";

export async function submitDeliveryProof(params: {
  orderId?: string;
  dispatchJobId?: string;
  driverUserId: string;
  proofType?: "photo" | "signature" | "both";
  photoUrl?: string;
  signatureData?: string;
  geoLat?: number;
  geoLng?: number;
  notes?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("delivery_proofs")
    .insert({
      order_id: params.orderId ?? null,
      dispatch_job_id: params.dispatchJobId ?? null,
      driver_user_id: params.driverUserId,
      proof_type: params.proofType ?? "photo",
      photo_url: params.photoUrl ?? null,
      signature_data: params.signatureData ?? null,
      geo_lat: params.geoLat ?? null,
      geo_lng: params.geoLng ?? null,
      notes: params.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getDeliveryProof(orderId: string) {
  const { data, error } = await (supabase as any)
    .from("delivery_proofs")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
