import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Mail, Smartphone, MessageSquare, Tag, Package, Newspaper } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useUiEngine } from "@/hooks/useUiEngine";
import { db } from "@/services/db";

interface MarketingPrefs {
  email_promotions: boolean;
  email_product_updates: boolean;
  email_newsletter: boolean;
  push_promotions: boolean;
  push_product_updates: boolean;
  push_newsletter: boolean;
  sms_promotions: boolean;
  sms_product_updates: boolean;
  sms_newsletter: boolean;
}

const DEFAULT_PREFS: MarketingPrefs = {
  email_promotions: false,
  email_product_updates: true,
  email_newsletter: false,
  push_promotions: false,
  push_product_updates: true,
  push_newsletter: false,
  sms_promotions: false,
  sms_product_updates: false,
  sms_newsletter: false,
};

const CHANNELS = [
  { key: "email" as const, label: "Email", icon: Mail },
  { key: "push" as const, label: "Push", icon: Smartphone },
  { key: "sms" as const, label: "SMS", icon: MessageSquare },
] as const;

const TYPES = [
  { key: "promotions" as const, label: "Promotions & deals", icon: Tag },
  { key: "product_updates" as const, label: "Product updates", icon: Package },
  { key: "newsletter" as const, label: "Newsletter", icon: Newspaper },
] as const;

const GOLD = "hsl(38 65% 56%)";

export default function SettingsMarketing() {
  useUiEngine("settings-marketing");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<MarketingPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    db("profiles")
      .select("marketing_preferences")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data && (data as any).marketing_preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...(data as any).marketing_preferences });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  const toggle = async (channel: string, type: string) => {
    const key = `${channel}_${type}` as keyof MarketingPrefs;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    if (!user) return;
    setSaving(true);
    try {
      await db("profiles")
        .update({ marketing_preferences: newPrefs } as any)
        .eq("id", user.id);
    } catch {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    }
    setSaving(false);
  };

  const optOutAll = async () => {
    const allOff: MarketingPrefs = {
      email_promotions: false,
      email_product_updates: false,
      email_newsletter: false,
      push_promotions: false,
      push_product_updates: false,
      push_newsletter: false,
      sms_promotions: false,
      sms_product_updates: false,
      sms_newsletter: false,
    };
    setPrefs(allOff);
    if (!user) return;
    setSaving(true);
    try {
      await db("profiles")
        .update({ marketing_preferences: allOff } as any)
        .eq("id", user.id);
      toast({ title: "All marketing communications disabled" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5" style={{ color: GOLD }} />
          <h1 className="text-lg font-bold">{t("settings.marketing") || "Marketing Preferences"}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-4 overflow-y-auto">
        <div
          className="rounded-2xl border p-4"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
        >
          <p className="text-xs text-muted-foreground mb-4">
            Choose what types of marketing communications you'd like to receive and through which channels.
            You can change these at any time. Required transactional emails (receipts, security alerts) are not affected.
          </p>

          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 12, fontWeight: 600 }} />
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <th key={ch.key} style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, fontWeight: 500 }}>
                        <div className="flex flex-col items-center gap-1">
                          <Icon style={{ width: 16, height: 16, opacity: 0.7 }} />
                          <span>{ch.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <tr key={type.key} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                      <td style={{ padding: "10px 4px" }}>
                        <div className="flex items-center gap-2">
                          <TypeIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{type.label}</span>
                        </div>
                      </td>
                      {CHANNELS.map((ch) => {
                        const key = `${ch.key}_${type.key}` as keyof MarketingPrefs;
                        const isOn = prefs[key];
                        return (
                          <td key={ch.key} style={{ textAlign: "center", padding: "10px 4px" }}>
                            <button
                              onClick={() => toggle(ch.key, type.key)}
                              disabled={saving}
                              style={{
                                width: 40,
                                height: 22,
                                borderRadius: 11,
                                border: "none",
                                background: isOn ? GOLD : "hsl(var(--muted))",
                                position: "relative",
                                cursor: "pointer",
                                transition: "background 0.2s",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: 2,
                                  left: isOn ? 20 : 2,
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  background: "#fff",
                                  transition: "left 0.2s",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                }}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={optOutAll}
          className="w-full rounded-xl border py-2.5 text-sm font-medium"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--destructive))" }}
        >
          Opt out of all marketing
        </button>

        <p className="text-xs text-muted-foreground text-center px-4">
          GDPR Art. 7 — You have the right to withdraw consent at any time.
          Transactional communications (receipts, security alerts, account notifications) are not affected by these preferences.
        </p>
      </div>
    </div>
  );
}
