import { supabase } from "@/integrations/supabase/client";

export async function serverCreateRentPayment(input: {
  leaseId: string;
  dueDate: string;
  reference?: string;
}) {
  const { data, error } = await supabase.functions.invoke("rent-create-payment", {
    body: input,
  });
  if (error) throw error;
  return data;
}
