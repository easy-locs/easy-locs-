/**
 * auth-utils.repository — Auth session/user helpers for hooks/components.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user || null, error };
}

export async function getAuthSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session || null, error };
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function hasRole(userId: string, role: "accountant" | "admin" | "agent" | "member" | "owner" | "staff") {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  return !!data;
}

export async function validateTenantInvitation(token: string) {
  const { data, error } = await supabase.rpc("validate_tenant_invitation", { _token: token });
  if (error) throw error;
  return data;
}

export async function invokeTenantSignup(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("tenant-signup", { body });
  if (error) throw error;
  return data;
}
