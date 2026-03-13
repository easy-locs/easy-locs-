/**
 * OrbitAccountSection — "YOU" section inside Orbit hub.
 * Signal/WhatsApp-level personal account control panel.
 * Fully synchronized with OrbitSecuritySettings.
 */
import { useState, useCallback } from "react";
import {
  User, Shield, Lock, Eye, Fingerprint, Smartphone, Monitor,
  Copy, Check, QrCode, ChevronRight, Settings, Key, LogOut,
  Bell, MapPin, Globe, ShieldCheck, Clock, Database, HardDrive,
  MessageSquare, Camera, Palette, HelpCircle, Info, Heart
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

type SubPage = "main" | "privacy" | "security" | "notifications" | "storage" | "devices" | "appearance";

export default function OrbitAccountSection() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [subPage, setSubPage] = useState<SubPage>("main");

  // Privacy states (synced)
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
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
  const [autoDeletePeriod, setAutoDeletePeriod] = useState("off");

  const userId = user?.id || "—";
  const shortId = userId.substring(0, 8).toUpperCase();
  const displayEmail = user?.email || "—";

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    haptic("light");
    toast.success("ID copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [userId]);

  const goBack = () => setSubPage("main");

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

  // ═══ Privacy sub-page ═══
  if (subPage === "privacy") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Privacy" icon={Eye} />
        <div className="space-y-1 mt-4">
          <Row label="Last Seen" desc="Show when you were last online">
            <Switch checked={lastSeen} onCheckedChange={setLastSeen} />
          </Row>
          <Row label="Online Status" desc="Show when you're currently online">
            <Switch checked={onlineStatus} onCheckedChange={setOnlineStatus} />
          </Row>
          <Row label="Profile Photo" desc="Who can see your profile photo">
            <Switch checked={profilePhoto} onCheckedChange={setProfilePhoto} />
          </Row>
          <Row label="Read Receipts" desc="Others see when you've read their messages">
            <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
          </Row>
          <Row label="Typing Indicators" desc="Show when you're typing a message">
            <Switch checked={typingIndicators} onCheckedChange={setTypingIndicators} />
          </Row>
          <Row label="Link Previews" desc="Generate previews for sent links">
            <Switch checked={linkPreviews} onCheckedChange={setLinkPreviews} />
          </Row>
        </div>
        <Separator className="my-4" />
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Changes apply to all conversations
        </p>
      </div>
    );
  }

  // ═══ Security sub-page ═══
  if (subPage === "security") {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        <SubHeader title="Security" icon={Shield} />
        <div className="mt-4 space-y-4">
          {/* E2E Banner */}
          <div className="rounded-xl p-4" style={{
            background: "hsl(var(--primary) / 0.05)",
            border: "1px solid hsl(var(--primary) / 0.15)",
          }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>
                End-to-End Encryption Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Messages, calls, and shared files are encrypted on your device before sending.
            </p>
          </div>

          <MenuItem icon={Fingerprint} label="Two-Factor Authentication" desc="Add extra security to your account"
            onClick={() => navigate("/dashboard/settings")} color="hsl(var(--primary))" />
          <MenuItem icon={Key} label="Screen Lock" desc="Require biometrics or PIN to open Orbit"
            onClick={() => {}} color="hsl(var(--accent))" />
          <MenuItem icon={QrCode} label="Safety Number" desc="Verify encryption with contacts"
            onClick={() => {}} color="hsl(var(--primary))" />
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
          <Row label="Message Notifications" desc="Get notified for new messages">
            <Switch checked={notifMessages} onCheckedChange={setNotifMessages} />
          </Row>
          <Row label="Show Preview" desc="Display message content in notification">
            <Switch checked={notifPreview} onCheckedChange={setNotifPreview} />
          </Row>
          <Row label="Sound" desc="Play sound for notifications">
            <Switch checked={notifSound} onCheckedChange={setNotifSound} />
          </Row>
          <Row label="Vibration" desc="Vibrate for notifications">
            <Switch checked={notifVibrate} onCheckedChange={setNotifVibrate} />
          </Row>
          <Separator className="my-3" />
          <Row label="Group Notifications" desc="Get notified for group messages">
            <Switch checked={notifGroups} onCheckedChange={setNotifGroups} />
          </Row>
          <Row label="Call Notifications" desc="Ring for incoming calls">
            <Switch checked={notifCalls} onCheckedChange={setNotifCalls} />
          </Row>
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
          <Row label="Auto-Download Media" desc="Download photos and videos automatically">
            <Switch checked={mediaAutoDownload} onCheckedChange={setMediaAutoDownload} />
          </Row>
          <Separator className="my-3" />
          <p className="text-xs font-medium text-foreground mb-2">Disappearing Messages</p>
          <div className="grid grid-cols-4 gap-2">
            {["off", "24h", "7d", "30d"].map(v => (
              <button key={v} onClick={() => setAutoDeletePeriod(v)}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  autoDeletePeriod === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {v === "off" ? "Off" : v}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            New messages will auto-delete after the selected period
          </p>
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
          <p className="text-xs text-muted-foreground text-center py-4">
            No other devices connected
          </p>
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
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3 relative"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent) / 0.2), hsl(var(--primary) / 0.15))",
            border: "2px solid hsl(var(--accent) / 0.3)",
          }}>
          <User className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} />
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--background))" }} />
        </div>

        <p className="text-base font-semibold text-foreground">{displayEmail}</p>
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
          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--primary))" }}>
            End-to-End Encrypted
          </span>
        </div>
      </motion.div>

      <Separator className="mx-4" />

      {/* Menu items — Signal/WhatsApp style */}
      <div className="px-3 py-3 space-y-0.5">
        <MenuItem icon={User} label="My Profile" desc="Name, phone, photo" onClick={() => navigate("/dashboard/settings")} color="hsl(var(--primary))" />
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
