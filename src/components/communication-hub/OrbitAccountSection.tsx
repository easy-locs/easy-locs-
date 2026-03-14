/**
 * OrbitAccountSection — "YOU" section inside Orbit hub.
 * Signal/WhatsApp-level personal account control panel with profile editing.
 */
import { useState, useCallback, useRef } from "react";
import {
  User, Shield, Lock, Eye, Fingerprint, Smartphone,
  Copy, Check, QrCode, ChevronRight, Key, LogOut,
  Bell, Database, ShieldCheck, HelpCircle, Camera, Pencil,
  Image, ShieldAlert, Timer, Ban, UserX, Globe, ScanFace, KeyRound, Wifi
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
type SubPage = "main" | "privacy" | "security" | "notifications" | "storage" | "devices" | "edit-profile";

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

  // Privacy states — backed by profiles table via usePrivacySettings
  const { settings: privacy, update: updatePrivacy, loaded: privacyLoaded } = usePrivacySettings();
  const readReceipts = privacy.readReceipts;
  const typingIndicators = privacy.typingIndicators;
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [lastSeen, setLastSeen] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState(true);
  const [linkPreviews, setLinkPreviews] = useState(true);

  // Notifications states
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPreview, setNotifPreview] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifVibrate, setNotifVibrate] = useState(true);
  const [notifGroups, setNotifGroups] = useState(true);
  const [notifCalls, setNotifCalls] = useState(true);

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
    toast.success("ID copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [userId]);

  const goBack = () => setSubPage("main");

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

      // Also update profiles table
      await supabase.from("profiles").update({
        name: displayName,
      }).eq("id", user.id);

      haptic("medium");
      toast.success("Profile updated!");
      setSubPage("main");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
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
        <SubHeader title="Edit Profile" icon={User} />
        <div className="flex flex-col items-center mt-6 mb-6">
          {/* Avatar with camera button */}
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
              <Image className="h-3 w-3" /> Gallery
            </button>
            <button onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "image/*";
              inp.capture = "user";
              inp.onchange = () => { const f = inp.files?.[0]; if (f) { const ev = { target: { files: [f] } } as any; handleAvatarUpload(ev); } };
              inp.click();
            }} className="text-[11px] font-medium px-3 py-1 rounded-full border border-border/30 flex items-center gap-1.5 hover:bg-muted/30 transition-colors" style={{ color: "hsl(var(--primary))" }}>
              <Camera className="h-3 w-3" /> Camera
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-muted/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <Input value={displayEmail} disabled className="bg-muted/30 opacity-60" />
            <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Orbit ID</label>
            <div className="flex items-center gap-2">
              <Input value={`EL-${shortId}`} disabled className="bg-muted/30 opacity-60 font-mono" />
              <Button variant="outline" size="icon" onClick={copyId} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full mt-4"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    );
  }

  // ═══ Privacy sub-page ═══
  if (subPage === "privacy") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Privacy" icon={Eye} />
        
        {/* Display Name Control */}
        <div className="mt-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Display Name</p>
          <p className="text-[11px] text-muted-foreground mb-3">Choose what name others see when you call or message them</p>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { value: "real", label: "Real Name", desc: "Show your full profile name" },
              { value: "username", label: "Username", desc: "Show your Orbit username (EL-ID)" },
              { value: "custom", label: "Custom Name", desc: "Set a custom display name" },
              { value: "anonymous", label: "Anonymous", desc: 'Show as "Private contact"' },
              { value: "hidden", label: "Hidden", desc: "Only show avatar, no name" },
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
          <Row label="Last Seen" desc="Show when you were last online"><Switch checked={lastSeen} onCheckedChange={setLastSeen} /></Row>
          <Row label="Online Status" desc="Show when you're currently online"><Switch checked={onlineStatus} onCheckedChange={setOnlineStatus} /></Row>
          <Row label="Profile Photo" desc="Who can see your profile photo"><Switch checked={profilePhoto} onCheckedChange={setProfilePhoto} /></Row>
          <Row label="Read Receipts" desc="Others see when you've read their messages"><Switch checked={readReceipts} onCheckedChange={(v) => updatePrivacy({ readReceipts: v })} /></Row>
          <Row label="Typing Indicators" desc="Show when you're typing a message"><Switch checked={typingIndicators} onCheckedChange={(v) => updatePrivacy({ typingIndicators: v })} /></Row>
          <Row label="Link Previews" desc="Generate previews for sent links"><Switch checked={linkPreviews} onCheckedChange={setLinkPreviews} /></Row>
        </div>
        <Separator className="my-4" />
        <p className="text-[10px] text-muted-foreground/50 text-center">Changes apply to all conversations</p>
      </div>
    );
  }

  // ═══ Security sub-page ═══
  if (subPage === "security") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Security" icon={Shield} />
        <div className="mt-4 space-y-4">
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>End-to-End Encryption Active</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">AES-256-GCM · ECDH P-256 · Messages, calls, files are encrypted on-device before sending.</p>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-4">Authentication</p>
          <MenuItem icon={Fingerprint} label="Two-Factor Authentication" desc="Add extra security to your account" onClick={() => navigate("/dashboard/settings")} color="hsl(var(--primary))" />
          <MenuItem icon={ScanFace} label="Biometric Lock" desc="Face ID / fingerprint to open Orbit" onClick={() => toast.info("Coming soon")} color="hsl(var(--accent))" />
          <MenuItem icon={KeyRound} label="PIN Lock" desc="4-digit PIN to access messages" onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />

          <Separator className="my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Encryption</p>
          <MenuItem icon={QrCode} label="Safety Number" desc="Verify encryption with contacts" onClick={() => toast.info("Tap a contact → Shield icon")} color="hsl(var(--primary))" />
          <MenuItem icon={Key} label="Encryption Keys" desc="View and export your identity keys" onClick={() => toast.info("Keys stored securely on device")} color="hsl(var(--accent))" />

          <Separator className="my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message Protection</p>
          <MenuItem icon={Lock} label="Chat Lock" desc="Lock individual conversations with PIN" onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />
          <MenuItem icon={Timer} label="Disappearing Messages" desc="Auto-delete after set time" onClick={() => setSubPage("storage")} color="hsl(var(--accent))" />
          <MenuItem icon={Ban} label="Screenshot Protection" desc="Block screenshots in private chats" onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />

          <Separator className="my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Advanced</p>
          <MenuItem icon={UserX} label="Blocked Contacts" desc="Manage blocked users" onClick={() => toast.info("No blocked contacts")} color="hsl(var(--destructive, 0 84% 60%))" />
          <MenuItem icon={ShieldAlert} label="Security Notifications" desc="Get alerts on key changes" onClick={() => toast.info("Enabled by default")} color="hsl(var(--accent))" />
          <MenuItem icon={Globe} label="Relay Calls" desc="Route calls through Orbit servers" onClick={() => toast.info("Coming soon")} color="hsl(var(--primary))" />
          <MenuItem icon={Wifi} label="Proxy" desc="Route traffic through proxy for anonymity" onClick={() => toast.info("Coming soon")} color="hsl(var(--accent))" />
        </div>
      </div>
    );
  }

  // ═══ Notifications sub-page ═══
  if (subPage === "notifications") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Notifications" icon={Bell} />
        <div className="space-y-1 mt-4">
          <Row label="Message Notifications" desc="Get notified for new messages"><Switch checked={notifMessages} onCheckedChange={setNotifMessages} /></Row>
          <Row label="Show Preview" desc="Display message content"><Switch checked={notifPreview} onCheckedChange={setNotifPreview} /></Row>
          <Row label="Sound" desc="Play sound for notifications"><Switch checked={notifSound} onCheckedChange={setNotifSound} /></Row>
          <Row label="Vibration" desc="Vibrate for notifications"><Switch checked={notifVibrate} onCheckedChange={setNotifVibrate} /></Row>
          <Separator className="my-3" />
          <Row label="Group Notifications" desc="Get notified for group messages"><Switch checked={notifGroups} onCheckedChange={setNotifGroups} /></Row>
          <Row label="Call Notifications" desc="Ring for incoming calls"><Switch checked={notifCalls} onCheckedChange={setNotifCalls} /></Row>
        </div>
      </div>
    );
  }

  // ═══ Storage sub-page ═══
  if (subPage === "storage") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Storage & Data" icon={Database} />
        <div className="space-y-1 mt-4">
          <Row label="Auto-Download Media" desc="Download photos and videos automatically"><Switch checked={mediaAutoDownload} onCheckedChange={setMediaAutoDownload} /></Row>
          <Separator className="my-3" />
          <p className="text-xs font-medium text-foreground mb-2">Disappearing Messages</p>
          <div className="grid grid-cols-4 gap-2">
            {["off", "24h", "7d", "30d"].map(v => (
              <button key={v} onClick={() => updatePrivacy({ defaultDisappearTtl: v })}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${privacy.defaultDisappearTtl === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {v === "off" ? "Off" : v}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">New messages will auto-delete after the selected period</p>
        </div>
      </div>
    );
  }

  // ═══ Devices sub-page ═══
  if (subPage === "devices") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Connected Devices" icon={Smartphone} />
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">This Device</p>
              <p className="text-[11px] text-muted-foreground">Active now</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
          <p className="text-xs text-muted-foreground text-center py-4">No other devices connected</p>
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
          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--primary))" }}>End-to-End Encrypted</span>
        </div>
      </motion.div>

      <Separator className="mx-4" />

      {/* Menu items */}
      <div className="px-3 py-3 space-y-0.5">
        <MenuItem icon={Pencil} label="Edit Profile" desc="Name, photo, identity" onClick={() => setSubPage("edit-profile")} color="hsl(var(--primary))" />
        <MenuItem icon={QrCode} label="Account ID" desc={`EL-${shortId}`} onClick={copyId} color="hsl(var(--accent))" />

        <Separator className="my-2 mx-3" />

        <MenuItem icon={Eye} label="Privacy" desc="Last seen, read receipts, typing" onClick={() => setSubPage("privacy")} color="hsl(var(--primary))" />
        <MenuItem icon={Shield} label="Security" desc="E2E encryption, 2FA, screen lock" onClick={() => setSubPage("security")} color="hsl(var(--accent))" />
        <MenuItem icon={Bell} label="Notifications" desc="Messages, calls, sounds" onClick={() => setSubPage("notifications")} color="hsl(var(--primary))" />
        <MenuItem icon={Database} label="Storage & Data" desc="Media, disappearing messages" onClick={() => setSubPage("storage")} color="hsl(var(--accent))" />
        <MenuItem icon={Smartphone} label="Connected Devices" desc="Manage active sessions" onClick={() => setSubPage("devices")} color="hsl(var(--primary))" />

        <Separator className="my-2 mx-3" />

        <MenuItem icon={HelpCircle} label="Help" desc="FAQ, contact support" onClick={() => navigate("/contact")} color="hsl(var(--muted-foreground))" />
      </div>

      <Separator className="mx-4" />

      {/* Logout */}
      <div className="px-3 py-3">
        <button onClick={async () => { haptic("medium"); await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
            <LogOut className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">{t("nav.logout") || "Log out"}</p>
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
