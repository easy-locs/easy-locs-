import { supabase } from "@/integrations/supabase/client";
import { createOrder, updateOrderStatus } from "@/lib/orders/orders-core";

export async function createTaxiRideRequest(params: {
  workspaceId?: string;
  pickupAddressId?: string;
  dropoffAddressId?: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  vehiclePreference?: "economy" | "comfort" | "xl";
}) {
  const order = await createOrder({
    workspaceId: params.workspaceId,
    orderType: "taxi_ride",
    serviceMode: "taxi",
    pickupAddressId: params.pickupAddressId,
    dropoffAddressId: params.dropoffAddressId,
  });

  const { data: ride, error } = await (supabase as any)
    .from("taxi_ride_requests")
    .insert({
      order_id: order.id,
      rider_user_id: order.customer_user_id,
      pickup_label: params.pickupLabel,
      dropoff_label: params.dropoffLabel,
      pickup_lat: params.pickupLat ?? null,
      pickup_lng: params.pickupLng ?? null,
      dropoff_lat: params.dropoffLat ?? null,
      dropoff_lng: params.dropoffLng ?? null,
      vehicle_preference: params.vehiclePreference ?? "economy",
      status: "searching",
    })
    .select("*")
    .single();

  if (error) throw error;
  await updateOrderStatus({ orderId: order.id, status: "paid" });
  return { order, ride };
}
