/**
 * OrbitAccountSection — "YOU" section inside Orbit hub.
 * Personal account control panel with identity, privacy, security, devices.
 */
import { useState, useCallback } from "react";
import {
  User, Shield, Lock, Eye, Fingerprint, Smartphone, Monitor,
  Copy, Check, QrCode, ChevronRight, Settings, Key, LogOut,
  Bell, MapPin, Globe, ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

export default function OrbitAccountSection() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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

  const MENU_ITEMS = [
    {
      icon: User,
      label: t("settings.my_profile") || "My Profile",
      desc: t("settings.profile_desc") || "Name, phone, address",
      action: () => navigate("/dashboard/settings"),
      color: "hsl(var(--primary))",
    },
    {
      icon: QrCode,
      label: "Account ID",
      desc: `EL-${shortId}`,
      action: copyId,
      color: "hsl(var(--accent))",
    },
    {
      icon: Shield,
      label: t("settings.privacy") || "Privacy",
      desc: t("settings.privacy_desc") || "Last seen, profile visibility, read receipts",
      action: () => navigate("/client/settings"),
      color: "hsl(var(--hud-purple))",
    },
    {
      icon: Lock,
      label: t("settings.security") || "Security",
      desc: t("settings.security_desc") || "Encryption, screen lock, biometrics",
      action: () => navigate("/client/settings"),
      color: "hsl(var(--hud-success))",
    },
    {
      icon: Smartphone,
      label: t("settings.devices") || "Connected Devices",
      desc: t("settings.devices_desc") || "Manage active sessions",
      action: () => navigate("/client/settings"),
      color: "hsl(var(--info))",
    },
    {
      icon: Bell,
      label: t("settings.notifications") || "Notifications",
      desc: t("settings.notifications_desc") || "Push, email, sounds",
      action: () => navigate("/client/settings"),
      color: "hsl(var(--warning))",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-8 px-4"
      >
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-3 relative"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent) / 0.2), hsl(var(--primary) / 0.15))",
            border: "2px solid hsl(var(--accent) / 0.3)",
          }}
        >
          <User className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} />
          {/* Online dot */}
          <div
            className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2"
            style={{
              background: "hsl(var(--hud-success))",
              borderColor: "hsl(var(--background))",
            }}
          />
        </div>

        <p className="text-base font-semibold text-foreground">{displayEmail}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: "hsl(var(--accent) / 0.1)",
              color: "hsl(var(--accent))",
            }}
          >
            EL-{shortId}
          </span>
          <button
            onClick={copyId}
            className="p-0.5 rounded transition-colors hover:bg-muted"
          >
            {copied ? (
              <Check className="h-3 w-3" style={{ color: "hsl(var(--hud-success))" }} />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* E2E badge */}
        <div className="flex items-center gap-1.5 mt-3">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-success))" }} />
          <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-success))" }}>
            End-to-End Encrypted
          </span>
        </div>
      </motion.div>

      <Separator className="mx-4" />

      {/* Menu items */}
      <div className="px-3 py-3 space-y-0.5">
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            onClick={item.action}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${item.color}15` }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
          </motion.button>
        ))}
      </div>

      <Separator className="mx-4" />

      {/* Logout */}
      <div className="px-3 py-3">
        <button
          onClick={async () => {
            haptic("medium");
            await signOut();
            navigate("/login");
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
            <LogOut className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">{t("nav.logout") || "Log out"}</p>
        </button>
      </div>

      {/* Version */}
      <div className="text-center pb-6">
        <p className="text-[10px] text-muted-foreground/40">Orbit v1.0 — Easy-Locs®</p>
      </div>
    </div>
  );
}
