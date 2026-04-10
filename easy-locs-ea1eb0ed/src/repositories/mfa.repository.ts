/**
 * mfa.repository — MFA operations via supabase.auth.mfa
 */
import { supabase } from "@/integrations/supabase/client";

export async function listFactors() {
  const { data } = await supabase.auth.mfa.listFactors();
  return data;
}

export async function enrollTotp(friendlyName: string) {
  return supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
}

export async function challengeFactor(factorId: string) {
  return supabase.auth.mfa.challenge({ factorId });
}

export async function verifyFactor(factorId: string, challengeId: string, code: string) {
  return supabase.auth.mfa.verify({ factorId, challengeId, code });
}

export async function unenrollFactor(factorId: string) {
  return supabase.auth.mfa.unenroll({ factorId });
}
