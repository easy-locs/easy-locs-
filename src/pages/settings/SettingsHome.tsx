/**
 * SettingsHome — Clean hierarchical settings hub.
 * Route: /settings
 */
import { useNavigate } from "react-router-dom";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { ArrowLeft, User, CreditCard, MapPin, Bell, Shield, Store, Palette, Globe, ChevronRight, FileText, Headphones, Heart } from "lucide-react";

const SETTINGS_GROUPS = [
  {
    title: "Account",
    items: [
      { key: "account", icon: User, label: "Profile", desc: "Name, email, photo", path: "/settings/account" },
      { key: "security", icon: Shield, label: "Security", desc: "Password, PIN, MFA", path: "/settings/security" },
      { key: "notifications", icon: Bell, label: "Notifications", desc: "Alerts & push settings", path: "/settings/notifications" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { key: "orbit", icon: Globe, label: "Language & Region", desc: "Language, currency, format", path: "/settings/orbit" },
      { key: "preferences", icon: Palette, label: "Appearance", desc: "Theme, dark mode", path: "/settings/preferences" },
    ],
  },
  {
    title: "Payments & Delivery",
    items: [
      { key: "payment-methods", icon: CreditCard, label: "Payment Methods", desc: "Cards, wallet, cash", path: "/settings/payment-methods" },
      { key: "addresses", icon: MapPin, label: "Addresses", desc: "Saved delivery locations", path: "/settings/addresses" },
      { key: "favorites", icon: Heart, label: "Favorites", desc: "Saved merchants and stores", path: "/favorites" },
    ],
  },
  {
    title: "Business",
    items: [
      { key: "business", icon: Store, label: "Business Settings", desc: "Shop, store, organization", path: "/settings/business" },
    ],
  },
  {
    title: "Support",
    items: [
      { key: "support", icon: Headphones, label: "Help & Support", desc: "Contact us, FAQ", path: "/settings/support" },
      { key: "legal", icon: FileText, label: "Legal", desc: "Terms, privacy, licenses", path: "/legal" },
    ],
  },
];

export default function SettingsHome() {
  const navigate = useNavigate();
  useDinoPageAudit({ actorType: "user", pageKey: "settings_home" });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" data-settings-page>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/home")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-5 mt-1">
        {SETTINGS_GROUPS.map((group) => (
          <section key={group.title} className="space-y-1.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">{group.title}</h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
            >
              {group.items.map((item, idx) => (
                <button
                  key={item.key}
                  data-setting-row
                  onClick={() => navigate(item.path)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-muted/30 transition-colors text-left"
                  style={idx < group.items.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.08)" } : undefined}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--primary) / 0.08)" }}
                  >
                    <item.icon className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/30" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
