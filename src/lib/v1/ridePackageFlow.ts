import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

export async function createRidePackageMission(params: {
  customerUserId: string;
  type: "ride" | "package";
  pickupLabel: string;
  dropoffLabel: string;
  priceEstimate: number;
  notes?: string | null;
}) {
  const { data, error } = await (supabase as any)
    .from("orders")
    .insert({
      customer_user_id: params.customerUserId,
      order_type: params.type === "ride" ? "ride" : "send_package",
      status: "driver_search",
      payment_status: "pending",
      total_amount: Number(params.priceEstimate ?? 0),
      currency: "AED",
      notes: params.notes ?? null,
      pickup_label: params.pickupLabel,
      dropoff_label: params.dropoffLabel,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  platformBus.emit(
    "MISSION_CREATED",
    {
      orderId: data.id,
      city: "Dubai",
      zone: "",
      pickupLat: 0,
      pickupLng: 0,
    },
    "system"
  );

  return data;
}

export async function assignDriverToMission(params: {
  orderId: string;
  driverId: string;
}) {
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      driver_id: params.driverId,
      status: "driver_assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId);

  if (error) throw error;

  platformBus.emit(
    "MISSION_ACCEPTED",
    {
      orderId: params.orderId,
      driverId: params.driverId,
    },
    "system"
  );

  return true;
}

export async function advanceMissionStatus(params: {
  orderId: string;
  nextStatus: "picked_up" | "on_the_way" | "delivered";
}) {
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      status: params.nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId);

  if (error) throw error;

  if (params.nextStatus === "delivered") {
    platformBus.emit(
      "MISSION_COMPLETED",
      { orderId: params.orderId },
      "system"
    );
  }

  return true;
}

export async function submitMissionProof(params: {
  orderId: string;
  driverUserId: string;
  notes?: string | null;
}) {
  const { error } = await (supabase as any).from("delivery_proofs").insert({
    order_id: params.orderId,
    driver_user_id: params.driverUserId,
    notes: params.notes ?? null,
    proof_type: "photo",
    photo_url: null,
    geo_lat: null,
    geo_lng: null,
  });

  if (error) throw error;

  await advanceMissionStatus({ orderId: params.orderId, nextStatus: "delivered" });
  return true;
}
