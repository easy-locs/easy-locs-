import { supabase } from "@/integrations/supabase/client";

export async function searchDrivers(params: {
  query?: string;
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
  limit?: number;
}) {
  const modes = params.serviceMode
    ? [params.serviceMode, "mixed"]
    : undefined;

  let q = (supabase as any)
    .from("driver_profiles")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true)
    .order("last_seen_at", { ascending: false })
    .limit(params.limit ?? 20);

  if (modes) q = q.in("service_mode", modes);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  if (!params.query?.trim()) return rows;

  const needle = params.query.trim().toLowerCase();
  return rows.filter((row: any) =>
    [row.vehicle_type, row.plate_number, row.service_mode]
      .filter(Boolean)
      .some((v: string) => v.toLowerCase().includes(needle))
  );
}

export async function assignDriverDirectly(params: {
  orderId?: string;
  dispatchJobId?: string;
  driverUserId: string;
  finalFee?: number;
}) {
  if (params.orderId) {
    const { data, error } = await (supabase as any)
      .from("orders")
      .update({ assigned_driver_user_id: params.driverUserId, status: "assigned" } as any)
      .eq("id", params.orderId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  if (params.dispatchJobId) {
    const { data, error } = await (supabase as any)
      .from("dispatch_jobs")
      .update({ assigned_driver_id: params.driverUserId, final_fee: params.finalFee ?? null, status: "assigned" } as any)
      .eq("id", params.dispatchJobId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  throw new Error("orderId or dispatchJobId required");
}
