/**
 * usePrivacySettings — Server-persisted privacy preferences.
 * Replaces localStorage-only approach with profiles table columns.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PrivacySettings {
  readReceipts: boolean;
  typingIndicators: boolean;
  displayNameMode: "real" | "username" | "custom" | "anonymous" | "hidden";
  customDisplayName: string;
  defaultDisappearTtl: string; // "off" | "24h" | "7d" | "30d"
  lastSeen: boolean;
  onlineStatus: boolean;
  profilePhoto: boolean;
  linkPreviews: boolean;
}

const DEFAULTS: PrivacySettings = {
  readReceipts: true,
  typingIndicators: true,
  displayNameMode: "real",
  customDisplayName: "",
  defaultDisappearTtl: "off",
  lastSeen: true,
  onlineStatus: true,
  profilePhoto: true,
  linkPreviews: true,
};

export function usePrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("privacy_read_receipts, privacy_typing_indicators, display_name_mode, custom_display_name, default_disappear_ttl, privacy_last_seen, privacy_online_status, privacy_profile_photo, privacy_link_previews")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          readReceipts: (data as any).privacy_read_receipts ?? true,
          typingIndicators: (data as any).privacy_typing_indicators ?? true,
          displayNameMode: (data as any).display_name_mode || "real",
          customDisplayName: (data as any).custom_display_name || "",
          defaultDisappearTtl: (data as any).default_disappear_ttl || "off",
          lastSeen: (data as any).privacy_last_seen ?? true,
          onlineStatus: (data as any).privacy_online_status ?? true,
          profilePhoto: (data as any).privacy_profile_photo ?? true,
          linkPreviews: (data as any).privacy_link_previews ?? true,
        });
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const update = useCallback(async (patch: Partial<PrivacySettings>) => {
    if (!user?.id) return;
    const newSettings = { ...settings, ...patch };
    setSettings(newSettings);

    const dbPatch: Record<string, any> = {};
    if (patch.readReceipts !== undefined) dbPatch.privacy_read_receipts = patch.readReceipts;
    if (patch.typingIndicators !== undefined) dbPatch.privacy_typing_indicators = patch.typingIndicators;
    if (patch.displayNameMode !== undefined) dbPatch.display_name_mode = patch.displayNameMode;
    if (patch.customDisplayName !== undefined) dbPatch.custom_display_name = patch.customDisplayName;
    if (patch.defaultDisappearTtl !== undefined) dbPatch.default_disappear_ttl = patch.defaultDisappearTtl;
    if (patch.lastSeen !== undefined) dbPatch.privacy_last_seen = patch.lastSeen;
    if (patch.onlineStatus !== undefined) dbPatch.privacy_online_status = patch.onlineStatus;
    if (patch.profilePhoto !== undefined) dbPatch.privacy_profile_photo = patch.profilePhoto;
    if (patch.linkPreviews !== undefined) dbPatch.privacy_link_previews = patch.linkPreviews;

    await supabase.from("profiles").update(dbPatch as any).eq("id", user.id);
  }, [user?.id, settings]);

  return { settings, update, loaded };
}

/** Fetch another user's privacy settings (for checking before sending read receipts) */
export async function fetchUserPrivacy(userId: string): Promise<{ readReceipts: boolean; typingIndicators: boolean } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("privacy_read_receipts, privacy_typing_indicators")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    readReceipts: (data as any).privacy_read_receipts ?? true,
    typingIndicators: (data as any).privacy_typing_indicators ?? true,
  };
}

/** Calculate disappear_at timestamp from TTL string */
export function computeDisappearAt(ttl: string): string | null {
  if (!ttl || ttl === "off") return null;
  const now = new Date();
  switch (ttl) {
    case "24h": now.setHours(now.getHours() + 24); break;
    case "7d": now.setDate(now.getDate() + 7); break;
    case "30d": now.setDate(now.getDate() + 30); break;
    default: return null;
  }
  return now.toISOString();
}
