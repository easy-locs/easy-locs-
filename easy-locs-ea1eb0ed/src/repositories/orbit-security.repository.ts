/**
 * orbit-security.repository — DB operations for OrbitSecuritySettings.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOrbitPrivacySettings(userId: string) {
  const { data } = await supabase.from("profiles").select(
    "privacy_read_receipts, privacy_typing_indicators, privacy_online_status, privacy_link_previews, orbit_notifications, orbit_message_preview, orbit_media_auto_download, default_disappear_ttl"
  ).eq("id", userId).single();
  return data as any;
}

export async function updateProfileField(userId: string, column: string, value: any) {
  const { error } = await supabase.from("profiles").update({ [column]: value } as any).eq("id", userId);
  if (error) throw error;
}

export async function enrollMfa2FA() {
  return supabase.auth.mfa.enroll({ factorType: "totp" });
}
