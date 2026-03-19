/**
 * SettingsHome — Clean category navigation hub for settings
 * Route: /settings
 */
import { useNavigate } from "react-router-dom";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { ArrowLeft, User, Globe, Wallet, MapPin, Bell, Shield, Store, Palette, ChevronRight } from "lucide-react";

const SECTIONS = [
  { key: "account", icon: User, label: "Account", desc: "Profile, name, email", path: "/settings/account" },
  { key: "orbit", icon: Globe, label: "Orbit", desc: "Communication preferences", path: "/settings/orbit" },
  { key: "wallet", icon: Wallet, label: "Wallet", desc: "Payments & currency", path: "/settings/wallet" },
  { key: "addresses", icon: MapPin, label: "Addresses", desc: "Saved locations", path: "/settings/addresses" },
  { key: "notifications", icon: Bell, label: "Notifications", desc: "Alerts & sounds", path: "/settings/notifications" },
  { key: "security", icon: Shield, label: "Security", desc: "PIN, MFA, app lock", path: "/settings/security" },
  { key: "business", icon: Store, label: "Business", desc: "Shop & organization", path: "/settings/business" },
  { key: "preferences", icon: Palette, label: "Preferences", desc: "Branding & data", path: "/settings/preferences" },
];

export default function SettingsHome() {
  const navigate = useNavigate();
  useDinoPageAudit({ actorType: "user", pageKey: "settings_home" });

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">Settings</h1>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-2 mt-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => navigate(s.path)}
            className="w-full rounded-xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.3)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <s.icon className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{s.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
