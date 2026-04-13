import { db as supabase } from "@/services/db";

export async function serverCreateRentPayment(input: {
  leaseId: string;
  dueDate: string;
  reference?: string;
}) {
  const { data, error } = await supabase.functions.invoke("rent-payment", {
    body: { ...input, mode: "schedule" },
  });
  if (error) throw error;
  return data;
}
