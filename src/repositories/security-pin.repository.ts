/**
 * security-pin.repository — Edge function calls for PIN/wallet-pin.
 */
import { supabase } from "@/integrations/supabase/client";

export async function checkPinStatus() {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "check_status" },
  });
  if (error) throw error;
  return data;
}

export async function setPin(pin: string) {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "set_pin", pin },
  });
  if (error) throw error;
  return data;
}

export async function verifyPin(pin: string) {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "verify_pin", pin },
  });
  if (error) throw error;
  return data;
}
