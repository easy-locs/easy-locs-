/**
 * security-pin.repository — Edge function calls for PIN/wallet-pin.
 */
import { db as supabase } from "@/services/db";

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

export async function requestPinReset() {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "request_reset" },
  });
  if (error) throw error;
  return data;
}

export async function resetPinWithToken(token: string, newPin: string) {
  const { data, error } = await supabase.functions.invoke("wallet-pin", {
    body: { action: "reset_pin", token, pin: newPin },
  });
  if (error) throw error;
  return data;
}
