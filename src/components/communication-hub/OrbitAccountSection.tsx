/**
 * OrbitAccountSection — "YOU" section inside Orbit hub.
 * Signal/WhatsApp-level personal account control panel with profile editing.
 * Fully i18n'd and end-to-end operational.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  User, Shield, Lock, Eye, Fingerprint, Smartphone,
  Copy, Check, QrCode, ChevronRight, Key, LogOut,
  Bell, Database, ShieldCheck, HelpCircle, Camera, Pencil,
  Image, ShieldAlert, Timer, Ban, UserX, Globe, ScanFace, KeyRound, Wifi, AtSign,
  Store, MessageSquare, Palette, Film, Download, Archive, Trash2, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { getNotifAlertPrefs, setNotifAlertPrefs, requestNotificationPermission, type NotifAlertPrefs } from "@/lib/notif-alert-prefs";
import { useUsername } from "@/hooks/useUsername";
type SubPage = "main" | "privacy" | "security" | "notifications" | "storage" | "devices" | "edit-profile" | "chats";

export default function OrbitAccountSection() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [subPage, setSubPage] = useState<SubPage>("main");

  // Profile edit states
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { username, saveUsername, checkAvailability } = useUsername();
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => { if (username) setUsernameInput(username); }, [username]);

  // Privacy states — backed by profiles table via usePrivacySettings
  const { settings: privacy, update: updatePrivacy, loaded: privacyLoaded } = usePrivacySettings();
  const readReceipts = privacy.readReceipts;
  const typingIndicators = privacy.typingIndicators;
  const onlineStatus = privacy.onlineStatus;
  const lastSeen = privacy.lastSeen;
  const profilePhoto = privacy.profilePhoto;
  const linkPreviews = privacy.linkPreviews;

  // Notifications states — synced with notif-alert-prefs
  const [alertPrefs, setAlertPrefsState] = useState<NotifAlertPrefs>(getNotifAlertPrefs());
  const notifMessages = alertPrefs.typeAlerts.messages;
  const [notifPreview, setNotifPreview] = useState(true);
  const notifSound = alertPrefs.sound;
  const notifVibrate = alertPrefs.vibration;
  const notifGroups = alertPrefs.typeAlerts.bookings;
  const notifCalls = alertPrefs.browserNotifications;

  const toggleAlertPref = (key: keyof NotifAlertPrefs) => {
    if (key === "typeAlerts") return;
    const next = setNotifAlertPrefs({ [key]: !alertPrefs[key as keyof NotifAlertPrefs] });
    setAlertPrefsState(next);
    if (key === "vibration" && !alertPrefs.vibration && navigator.vibrate) {
      navigator.vibrate(50);
    }
    // Request browser notification permission when enabling
    if (key === "browserNotifications" && !alertPrefs.browserNotifications) {
      requestNotificationPermission();
    }
  };

  const toggleTypeAlert = (type: keyof typeof alertPrefs.typeAlerts) => {
    const next = setNotifAlertPrefs({ typeAlerts: { ...alertPrefs.typeAlerts, [type]: !alertPrefs.typeAlerts[type] } });
    setAlertPrefsState(next);
  };

  // Storage states
  const [mediaAutoDownload, setMediaAutoDownload] = useState(true);

  // Display name mode — from server
  type DisplayNameMode = "real" | "username" | "custom" | "anonymous" | "hidden";
  const displayNameMode = privacy.displayNameMode;
  const customDisplayName = privacy.customDisplayName;

  const userId = user?.id || "—";
  const shortId = userId.substring(0, 8).toUpperCase();
  const displayEmail = user?.email || "—";
  const initials = (displayName || displayEmail).substring(0, 2).toUpperCase();

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    haptic("light");
    toast.success(t("orbit.copied") || "ID copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [userId, t]);

  const goBack = () => setSubPage("main");

  const goToSettingsSection = useCallback((section: string) => {
    navigate(`/dashboard/settings?section=${encodeURIComponent(section)}`);
  }, [navigate]);

  // Upload avatar photo
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      
      setAvatarUrl(publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          display_name: displayName,
          avatar_url: avatarUrl,
        }
      });
      if (error) throw error;

      await supabase.from("profiles").update({
        name: displayName,
      }).eq("id", user.id);

      haptic("medium");
      toast.success(t("orbit.profile.save") || "Profile updated!");
      setSubPage("main");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Archive all chats
  const handleArchiveAll = async () => {
    if (!user) return;
    try {
      const { data: threads } = await supabase
        .from("conversation_threads")
        .select("id")
        .contains("participant_ids", [user.id]);
      
      if (threads && threads.length > 0) {
        for (const thread of threads) {
          await supabase.from("conversation_preferences").upsert({
            user_id: user.id,
            context_id: thread.id,
            archived: true,
          }, { onConflict: "user_id,context_id" });
        }
        toast.success(`${threads.length} ${t("orbit.chats.archive_all") || "chats archived"}`);
      } else {
        toast.info(t("orbit.no_conversations") || "No conversations");
      }
    } catch {
      toast.error("Failed to archive");
    }
  };

  // Clear all chats
  const handleClearAll = async () => {
    if (!user) return;
    try {
      const { data: threads } = await supabase
        .from("conversation_threads")
        .select("id")
        .contains("participant_ids", [user.id]);
      
      if (threads && threads.length > 0) {
        for (const thread of threads) {
          await supabase.from("conversation_preferences").upsert({
            user_id: user.id,
            context_id: thread.id,
            cleared_at: new Date().toISOString(),
          }, { onConflict: "user_id,context_id" });
        }
        toast.success(t("orbit.chats.clear_all") || "All chats cleared");
      }
    } catch {
      toast.error("Failed to clear");
    }
  };

  // Delete all chats
  const handleDeleteAll = async () => {
    if (!user) return;
    if (!confirm(t("orbit.delete_for_all_q") || "Delete all chats? This cannot be undone.")) return;
    try {
      const { data: threads } = await supabase
        .from("conversation_threads")
        .select("id")
        .contains("participant_ids", [user.id]);
      
      if (threads && threads.length > 0) {
        for (const thread of threads) {
          await supabase.from("conversation_preferences").upsert({
            user_id: user.id,
            context_id: thread.id,
            archived: true,
            cleared_at: new Date().toISOString(),
          }, { onConflict: "user_id,context_id" });
        }
        toast.success(t("orbit.chats.delete_all") || "All chats deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Export chat history
  const handleExportChat = async () => {
    if (!user) return;
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true })
        .limit(1000);
      
      if (!messages || messages.length === 0) {
        toast.info(t("orbit.no_conversations") || "No messages to export");
        return;
      }

      const text = messages.map(m => 
        `[${new Date(m.created_at).toLocaleString()}] ${m.sender_id === user.id ? "You" : "Contact"}: ${m.content}`
      ).join("\n");

      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-export-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("orbit.chats.export") || "Chat exported");
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Sub-page header ──
  const SubHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="flex items-center gap-3 pb-4 border-b border-border/15">
      <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
      </button>
      <Icon className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );

  // ── Setting row ──
  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  // ═══ Edit Profile sub-page ═══
  if (subPage === "edit-profile") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.edit_profile") || "Edit Profile"} icon={User} />
        <div className="flex flex-col items-center mt-6 mb-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-2 border-primary/20">
              <AvatarImage src={avatarUrl} alt="Profile" />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-medium px-3 py-1 rounded-full border border-border/30 flex items-center gap-1.5 hover:bg-muted/30 transition-colors" style={{ color: "hsl(var(--primary))" }}>
              <Image className="h-3 w-3" /> {t("orbit.profile.gallery") || "Gallery"}
            </button>
            <button onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "image/*";
              inp.capture = "user";
              inp.onchange = () => { const f = inp.files?.[0]; if (f) { const ev = { target: { files: [f] } } as any; handleAvatarUpload(ev); } };
              inp.click();
            }} className="text-[11px] font-medium px-3 py-1 rounded-full border border-border/30 flex items-center gap-1.5 hover:bg-muted/30 transition-colors" style={{ color: "hsl(var(--primary))" }}>
              <Camera className="h-3 w-3" /> {t("orbit.profile.camera") || "Camera"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("orbit.profile.display_name") || "Display Name"}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("ob.full_name") || "Your name"}
              className="bg-muted/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("orbit.profile.email") || "Email"}</label>
            <Input value={displayEmail} disabled className="bg-muted/30 opacity-60" />
            <p className="text-[10px] text-muted-foreground mt-1">{t("orbit.profile.email_cant_change") || "Email cannot be changed here"}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("orbit.profile.orbit_id") || "Orbit ID"}</label>
            <div className="flex items-center gap-2">
              <Input value={`EL-${shortId}`} disabled className="bg-muted/30 opacity-60 font-mono" />
              <Button variant="outline" size="icon" onClick={copyId} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <AtSign className="h-3 w-3" /> {t("orbit.profile.username") || "Username"}
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={usernameInput}
                onChange={async (e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
                  setUsernameInput(v);
                  if (v.length >= 3) {
                    const res = await checkAvailability(v);
                    setUsernameStatus(res.available ? { msg: t("orbit.profile.available") || "✅ Available", ok: true } : { msg: res.error || "Taken", ok: false });
                  } else {
                    setUsernameStatus(v.length > 0 ? { msg: t("orbit.profile.min_chars") || "Min 3 characters", ok: false } : null);
                  }
                }}
                placeholder="your.username"
                className="bg-muted/30 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={savingUsername || !usernameInput || usernameStatus?.ok === false}
                onClick={async () => {
                  setSavingUsername(true);
                  const res = await saveUsername(usernameInput);
                  if (res.success) { toast.success("Username saved!"); haptic("medium"); }
                  else toast.error(res.error || "Failed");
                  setSavingUsername(false);
                }}
              >
                {savingUsername ? "..." : "Set"}
              </Button>
            </div>
            {usernameStatus && (
              <p className={`text-[10px] mt-1 ${usernameStatus.ok ? "text-primary" : "text-destructive"}`}>
                {usernameStatus.msg}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{t("orbit.profile.username_others") || "Others can find you by @"}{usernameInput || "username"}</p>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full mt-4"
          >
            {saving ? (t("orbit.profile.saving") || "Saving...") : (t("orbit.profile.save") || "Save Changes")}
          </Button>
        </div>
      </div>
    );
  }

  // ═══ Privacy sub-page ═══
  if (subPage === "privacy") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.privacy") || "Privacy"} icon={Eye} />
        
        {/* Display Name Control */}
        <div className="mt-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t("orbit.privacy.display_name") || "Display Name"}</p>
          <p className="text-[11px] text-muted-foreground mb-3">{t("orbit.privacy.display_name_desc") || "Choose what name others see when you call or message them"}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { value: "real", label: t("orbit.privacy.real_name") || "Real Name", desc: t("orbit.privacy.real_name_desc") || "Show your full profile name" },
              { value: "username", label: t("orbit.privacy.username") || "Username", desc: t("orbit.privacy.username_desc") || "Show your Orbit username (EL-ID)" },
              { value: "custom", label: t("orbit.privacy.custom") || "Custom Name", desc: t("orbit.privacy.custom_desc") || "Set a custom display name" },
              { value: "anonymous", label: t("orbit.privacy.anonymous") || "Anonymous", desc: t("orbit.privacy.anonymous_desc") || 'Show as "Private contact"' },
              { value: "hidden", label: t("orbit.privacy.hidden") || "Hidden", desc: t("orbit.privacy.hidden_desc") || "Only show avatar, no name" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  updatePrivacy({ displayNameMode: opt.value as any });
                  haptic("selection");
                }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-colors"
                style={{
                  background: displayNameMode === opt.value ? "hsl(var(--primary) / 0.08)" : "transparent",
                  border: `1px solid ${displayNameMode === opt.value ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border) / 0.1)"}`,
                }}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${displayNameMode === opt.value ? "border-primary" : "border-muted-foreground/30"}`}>
                  {displayNameMode === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {displayNameMode === "custom" && (
            <div className="mt-2">
              <Input
                value={customDisplayName}
                onChange={e => {
                  updatePrivacy({ customDisplayName: e.target.value });
                }}
                placeholder="Enter custom name..."
                className="bg-muted/30 text-sm"
              />
            </div>
          )}
        </div>
        
        <Separator className="my-3" />
        <div className="space-y-1">
          <Row label={t("orbit.privacy.last_seen") || "Last Seen"} desc={t("orbit.privacy.last_seen_desc") || "Show when you were last online"}><Switch checked={lastSeen} onCheckedChange={(v) => updatePrivacy({ lastSeen: v })} /></Row>
          <Row label={t("orbit.privacy.online_status") || "Online Status"} desc={t("orbit.privacy.online_status_desc") || "Show when you're currently online"}><Switch checked={onlineStatus} onCheckedChange={(v) => updatePrivacy({ onlineStatus: v })} /></Row>
          <Row label={t("orbit.privacy.profile_photo") || "Profile Photo"} desc={t("orbit.privacy.profile_photo_desc") || "Who can see your profile photo"}><Switch checked={profilePhoto} onCheckedChange={(v) => updatePrivacy({ profilePhoto: v })} /></Row>
          <Row label={t("orbit.privacy.read_receipts") || "Read Receipts"} desc={t("orbit.privacy.read_receipts_desc") || "Others see when you've read their messages"}><Switch checked={readReceipts} onCheckedChange={(v) => updatePrivacy({ readReceipts: v })} /></Row>
          <Row label={t("orbit.privacy.typing") || "Typing Indicators"} desc={t("orbit.privacy.typing_desc") || "Show when you're typing a message"}><Switch checked={typingIndicators} onCheckedChange={(v) => updatePrivacy({ typingIndicators: v })} /></Row>
          <Row label={t("orbit.privacy.link_previews") || "Link Previews"} desc={t("orbit.privacy.link_previews_desc") || "Generate previews for sent links"}><Switch checked={linkPreviews} onCheckedChange={(v) => updatePrivacy({ linkPreviews: v })} /></Row>
        </div>
        <Separator className="my-4" />
        <p className="text-[10px] text-muted-foreground/50 text-center">{t("orbit.privacy.changes_apply") || "Changes apply to all conversations"}</p>
      </div>
    );
  }

  // ═══ Security sub-page ═══
  if (subPage === "security") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.security") || "Security"} icon={Shield} />
        <div className="mt-4 space-y-4">
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>{t("orbit.security.e2e_active") || "End-to-End Encryption Active"}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("orbit.security.e2e_desc") || "AES-256-GCM · ECDH P-256 · Messages, calls, files are encrypted on-device before sending."}</p>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-4">{t("orbit.security.auth") || "Authentication"}</p>
          <MenuItem icon={Fingerprint} label={t("orbit.security.2fa") || "Two-Factor Authentication"} desc={t("orbit.security.2fa_desc") || "Add extra security to your account"} onClick={() => navigate("/dashboard/settings")} color="hsl(var(--primary))" />
          <MenuItem icon={ScanFace} label={t("orbit.security.biometric") || "Biometric Lock"} desc={t("orbit.security.biometric_desc") || "Face ID / fingerprint to open Orbit"} onClick={() => toast.info("Coming soon")} color="hsl(var(--accent))" />
          <MenuItem icon={KeyRound} label={t("orbit.security.pin") || "PIN Lock"} desc={t("orbit.security.pin_desc") || "4-digit PIN to access messages"} onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />

          <Separator className="my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("orbit.security.encryption") || "Encryption"}</p>
          <MenuItem icon={QrCode} label={t("orbit.security.safety_number") || "Safety Number"} desc={t("orbit.security.safety_number_desc") || "Verify encryption with contacts"} onClick={() => toast.info("Tap a contact → Shield icon")} color="hsl(var(--primary))" />
          <MenuItem icon={Key} label={t("orbit.security.keys") || "Encryption Keys"} desc={t("orbit.security.keys_desc") || "View and export your identity keys"} onClick={() => toast.info("Keys stored securely on device")} color="hsl(var(--accent))" />

          <Separator className="my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("orbit.security.message_protection") || "Message Protection"}</p>
          <MenuItem icon={Lock} label={t("orbit.security.chat_lock") || "Chat Lock"} desc={t("orbit.security.chat_lock_desc") || "Lock individual conversations with PIN"} onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />
          <MenuItem icon={Timer} label={t("orbit.security.disappearing") || "Disappearing Messages"} desc={t("orbit.security.disappearing_desc") || "Auto-delete after set time"} onClick={() => setSubPage("storage")} color="hsl(var(--accent))" />
          <MenuItem icon={Ban} label={t("orbit.security.screenshot") || "Screenshot Protection"} desc={t("orbit.security.screenshot_desc") || "Block screenshots in private chats"} onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />

          <Separator className="my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("orbit.security.advanced") || "Advanced"}</p>
          <MenuItem icon={UserX} label={t("orbit.security.blocked") || "Blocked Contacts"} desc={t("orbit.security.blocked_desc") || "Manage blocked users"} onClick={async () => {
            // Fetch actual blocked contacts count
            if (!user) return;
            const { count } = await supabase
              .from("blocked_users")
              .select("id", { count: "exact", head: true })
              .eq("blocker_id", user.id);
            toast.info(count ? `${count} blocked contact(s)` : t("orbit.security.blocked_desc") || "No blocked contacts");
          }} color="hsl(var(--destructive, 0 84% 60%))" />
          <MenuItem icon={ShieldAlert} label={t("orbit.security.alerts") || "Security Notifications"} desc={t("orbit.security.alerts_desc") || "Get alerts on key changes"} onClick={() => toast.info("Enabled by default")} color="hsl(var(--accent))" />
          <MenuItem icon={Globe} label={t("orbit.security.relay") || "Relay Calls"} desc={t("orbit.security.relay_desc") || "Route calls through Orbit servers"} onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />
          <MenuItem icon={Wifi} label={t("orbit.security.proxy") || "Proxy"} desc={t("orbit.security.proxy_desc") || "Route traffic through proxy for anonymity"} onClick={() => toast.info("Coming soon")} color="hsl(var(--accent))" />
        </div>
      </div>
    );
  }

  // ═══ Chats sub-page ═══
  if (subPage === "chats") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.chats") || "Chats"} icon={MessageSquare} />
        <div className="space-y-1 mt-4">
          <MenuItem icon={Palette} label={t("orbit.chats.theme") || "Default Chat Theme"} desc={t("orbit.chats.theme_desc") || "Customize conversation appearance"} onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />
          <MenuItem icon={Film} label={t("orbit.chats.animations") || "Animations"} desc={t("orbit.chats.animations_desc") || "Emoji, stickers and GIFs movement"} onClick={() => toast.info("Coming soon")} color="hsl(var(--accent))" />
          <Row label={t("orbit.chats.save_photos") || "Save to Photos"} desc={t("orbit.chats.save_photos_desc") || "Auto-save received media to gallery"}>
            <Switch checked={mediaAutoDownload} onCheckedChange={setMediaAutoDownload} />
          </Row>
          <Separator className="my-3" />
          <MenuItem icon={Download} label={t("orbit.chats.export") || "Export Chat"} desc={t("orbit.chats.export_desc") || "Export conversation history"} onClick={handleExportChat} color="hsl(var(--primary))" />
          <Separator className="my-3" />
          <button onClick={handleArchiveAll} className="w-full text-left px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors">
            <p className="text-sm font-medium text-primary">{t("orbit.chats.archive_all") || "Archive All Chats"}</p>
          </button>
          <button onClick={handleClearAll} className="w-full text-left px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors">
            <p className="text-sm font-medium text-destructive">{t("orbit.chats.clear_all") || "Clear All Chats"}</p>
          </button>
          <button onClick={handleDeleteAll} className="w-full text-left px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors">
            <p className="text-sm font-medium text-destructive">{t("orbit.chats.delete_all") || "Delete All Chats"}</p>
          </button>
        </div>
      </div>
    );
  }

  // ═══ Notifications sub-page ═══
  if (subPage === "notifications") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.notifications") || "Notifications"} icon={Bell} />
        <div className="space-y-1 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t("orbit.notif.message_notif") || "Message notifications"}</p>
          <Row label={t("orbit.notif.show") || "Show Notifications"} desc={t("orbit.notif.show_desc") || "Get notified for new messages"}>
            <Switch checked={notifMessages} onCheckedChange={() => toggleTypeAlert("messages")} />
          </Row>
          <Row label={t("orbit.notif.sound") || "Sound"} desc={t("orbit.notif.sound_desc") || "Play sound for notifications"}>
            <Switch checked={notifSound} onCheckedChange={() => toggleAlertPref("sound")} />
          </Row>
          <Row label={t("orbit.notif.vibration") || "Vibration"} desc={t("orbit.notif.vibration_desc") || "Vibrate for notifications"}>
            <Switch checked={notifVibrate} onCheckedChange={() => toggleAlertPref("vibration")} />
          </Row>

          <Separator className="my-3" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t("orbit.notif.group") || "Group notifications"}</p>
          <Row label={t("orbit.notif.group_show") || "Show Notifications"} desc={t("orbit.notif.group_show_desc") || "Get notified for group messages"}>
            <Switch checked={notifGroups} onCheckedChange={() => toggleTypeAlert("bookings")} />
          </Row>

          <Separator className="my-3" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t("orbit.notif.call") || "Call notifications"}</p>
          <Row label={t("orbit.notif.ring") || "Ring for Calls"} desc={t("orbit.notif.ring_desc") || "Receive call notifications"}>
            <Switch checked={notifCalls} onCheckedChange={() => toggleAlertPref("browserNotifications")} />
          </Row>

          <Separator className="my-3" />
          <Row label={t("orbit.notif.preview") || "Show Preview"} desc={t("orbit.notif.preview_desc") || "Display message text in notifications"}>
            <Switch checked={notifPreview} onCheckedChange={setNotifPreview} />
          </Row>

          <Separator className="my-3" />
          <button onClick={() => {
            const next = setNotifAlertPrefs({
              browserNotifications: true, sound: true, vibration: true,
              typeAlerts: { messages: true, bookings: true, payments: true, documents: true, maintenance: true },
            });
            setAlertPrefsState(next);
            toast.success(t("orbit.notif.reset") || "Notification settings reset");
          }} className="w-full text-left px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors">
            <p className="text-sm font-medium text-destructive">{t("orbit.notif.reset") || "Reset Notification Settings"}</p>
          </button>
          <p className="text-[10px] text-muted-foreground mt-1 px-3">{t("orbit.notif.reset_desc") || "Reset all notification settings, including custom notification settings for your chats."}</p>
        </div>
      </div>
    );
  }

  // ═══ Storage sub-page ═══
  if (subPage === "storage") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.storage") || "Storage & Data"} icon={Database} />
        <div className="space-y-1 mt-4">
          <Row label={t("orbit.storage.auto_download") || "Auto-Download Media"} desc={t("orbit.storage.auto_download_desc") || "Download photos and videos automatically"}><Switch checked={mediaAutoDownload} onCheckedChange={setMediaAutoDownload} /></Row>
          <Separator className="my-3" />
          <p className="text-xs font-medium text-foreground mb-2">{t("orbit.storage.disappearing") || "Disappearing Messages"}</p>
          <div className="grid grid-cols-4 gap-2">
            {["off", "24h", "7d", "30d"].map(v => (
              <button key={v} onClick={() => updatePrivacy({ defaultDisappearTtl: v })}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${privacy.defaultDisappearTtl === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {v === "off" ? "Off" : v}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">{t("orbit.security.disappearing_desc") || "New messages will auto-delete after the selected period"}</p>
        </div>
      </div>
    );
  }

  // ═══ Devices sub-page ═══
  if (subPage === "devices") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title={t("orbit.you.devices") || "Connected Devices"} icon={Smartphone} />
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t("orbit.devices.this_device") || "This Device"}</p>
              <p className="text-[11px] text-muted-foreground">{t("orbit.devices.active_now") || "Active now"}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
          <p className="text-xs text-muted-foreground text-center py-4">{t("orbit.devices.no_other") || "No other devices connected"}</p>
        </div>
      </div>
    );
  }

  // ═══ Main page ═══
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-8 px-4">
        <div className="relative">
          <Avatar className="w-20 h-20 border-2 border-accent/30">
            <AvatarImage src={avatarUrl} alt="Profile" />
            <AvatarFallback className="text-2xl font-bold" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--background))" }} />
        </div>

        <p className="text-base font-semibold text-foreground mt-3">
          {displayName || displayEmail}
        </p>
        {username && (
          <p className="text-xs font-mono mt-0.5" style={{ color: "hsl(var(--primary))" }}>@{username}</p>
        )}
        {displayName && <p className="text-xs text-muted-foreground">{displayEmail}</p>}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}>
            EL-{shortId}
          </span>
          <button onClick={copyId} className="p-0.5 rounded transition-colors hover:bg-muted">
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--primary))" }}>{t("orbit.you.e2e_encrypted") || "End-to-End Encrypted"}</span>
        </div>
      </motion.div>

      <Separator className="mx-4" />

      {/* Menu items */}
      <div className="px-3 py-3 space-y-0.5">
        <MenuItem icon={Pencil} label={t("orbit.you.edit_profile") || "Edit Profile"} desc={t("orbit.you.name_photo_identity") || "Name, photo, identity"} onClick={() => setSubPage("edit-profile")} color="hsl(var(--primary))" />
        <MenuItem icon={QrCode} label={t("orbit.you.account_id") || "Account ID"} desc={`EL-${shortId}`} onClick={copyId} color="hsl(var(--accent))" />

        <Separator className="my-2 mx-3" />

        <MenuItem icon={Store} label={t("orbit.you.business_tools") || "Business Tools"} desc={t("orbit.you.marketplace_services") || "Marketplace, services, catalog"} onClick={() => navigate("/dashboard/marketplace")} color="hsl(var(--primary))" />
        <MenuItem icon={Star} label={t("orbit.you.starred") || "Starred"} desc={t("orbit.you.starred_messages") || "Starred messages and contacts"} onClick={() => toast.info("Coming soon")} color="hsl(var(--accent))" />

        <Separator className="my-2 mx-3" />

        <MenuItem icon={Eye} label={t("orbit.you.privacy") || "Privacy"} desc={t("orbit.you.privacy_desc") || "Last seen, read receipts, typing"} onClick={() => setSubPage("privacy")} color="hsl(var(--primary))" />
        <MenuItem icon={Shield} label={t("orbit.you.security") || "Security"} desc={t("orbit.you.security_desc") || "E2E encryption, 2FA, screen lock"} onClick={() => setSubPage("security")} color="hsl(var(--accent))" />
        <MenuItem icon={MessageSquare} label={t("orbit.you.chats") || "Chats"} desc={t("orbit.you.chats_desc") || "Theme, animations, export"} onClick={() => setSubPage("chats")} color="hsl(var(--primary))" />
        <MenuItem icon={Bell} label={t("orbit.you.notifications") || "Notifications"} desc={t("orbit.you.notif_desc") || "Messages, calls, sounds"} onClick={() => setSubPage("notifications")} color="hsl(var(--accent))" />
        <MenuItem icon={Database} label={t("orbit.you.storage") || "Storage & Data"} desc={t("orbit.you.storage_desc") || "Media, disappearing messages"} onClick={() => setSubPage("storage")} color="hsl(var(--primary))" />
        <MenuItem icon={Smartphone} label={t("orbit.you.devices") || "Connected Devices"} desc={t("orbit.you.devices_desc") || "Manage active sessions"} onClick={() => setSubPage("devices")} color="hsl(var(--accent))" />

        <Separator className="my-2 mx-3" />

        <MenuItem icon={HelpCircle} label={t("orbit.you.help") || "Help"} desc={t("orbit.you.help_desc") || "FAQ, contact support"} onClick={() => navigate("/contact")} color="hsl(var(--muted-foreground))" />
      </div>

      <Separator className="mx-4" />

      {/* Logout */}
      <div className="px-3 py-3">
        <button onClick={async () => { haptic("medium"); await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
            <LogOut className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">{t("orbit.you.logout") || t("nav.logout") || "Log out"}</p>
        </button>
      </div>

      <div className="text-center pb-6">
        <p className="text-[10px] text-muted-foreground/40">Orbit v1.0 — Easy-Locs®</p>
      </div>
    </div>
  );
}

// ── Reusable menu item ──
function MenuItem({ icon: Icon, label, desc, onClick, color }: {
  icon: any; label: string; desc: string; onClick: () => void; color: string;
}) {
  return (
    <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left group">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
    </motion.button>
  );
}
