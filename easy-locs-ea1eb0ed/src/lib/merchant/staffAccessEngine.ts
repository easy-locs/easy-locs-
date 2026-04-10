import { db } from "@/services/db";

export async function listMerchantStaff(merchantId: string) {
  const { data, error } = await db
    .from("merchant_staff")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function inviteMerchantStaff(params: {
  merchantId: string;
  fullName: string;
  email: string;
  role: "manager" | "cashier" | "kitchen" | "support";
}) {
  const { data, error } = await db
    .from("merchant_staff")
    .insert({
      merchant_id: params.merchantId,
      full_name: params.fullName,
      email: params.email,
      role: params.role,
      status: "invited",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleMerchantStaffStatus(staffId: string, active: boolean) {
  const { data, error } = await db
    .from("merchant_staff")
    .update({
      status: active ? "active" : "disabled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
