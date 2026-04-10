/**
 * SettingsOrbit — Language & Region settings page
 * Route: /settings/orbit
 */
import type { Locale } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "XOF", symbol: "CFA", label: "CFA Franc" },
  { code: "MAD", symbol: "MAD", label: "Moroccan Dirham" },
  { code: "GBP", symbol: "£", label: "British Pound" },
];

export default function SettingsOrbit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, setLocale, locale } = useI18n();
  const { toast } = useToast();
  const [selectedLang, setSelectedLang] = useState<Locale>((locale || "en") as Locale);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    if (!user) return;
    settingsRepo.fetchProfileLocale(user.id).then((data) => {
      if (data) {
        if ((data as any).locale) setSelectedLang((data as any).locale);
        if ((data as any).currency) setSelectedCurrency((data as any).currency);
      }
    });
  }, [user]);

  const saveLang = async (code: string) => {
    setSelectedLang(code as Locale);
    setLocale(code as any);
    if (user) {
      await settingsRepo.updateProfileField(user.id, "locale", code);
    }
    toast({ title: "Language updated" });
  };

  const saveCurrency = async (code: string) => {
    setSelectedCurrency(code);
    if (user) {
      await settingsRepo.updateProfileField(user.id, "currency", code);
    }
    toast({ title: "Currency updated" });
  };

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Language & Region</h1>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-5">
        {/* Language */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Language</h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            {LANGUAGES.map((lang, idx) => (
              <button
                key={lang.code}
                onClick={() => saveLang(lang.code)}
                className="w-full px-4 py-3.5 flex items-center justify-between active:bg-muted/30 transition-colors text-left"
                style={idx < LANGUAGES.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.08)" } : undefined}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{lang.label}</p>
                  <p className="text-[11px] text-muted-foreground">{lang.native}</p>
                </div>
                {selectedLang === lang.code && (
                  <Check className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Currency */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Currency</h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            {CURRENCIES.map((cur, idx) => (
              <button
                key={cur.code}
                onClick={() => saveCurrency(cur.code)}
                className="w-full px-4 py-3.5 flex items-center justify-between active:bg-muted/30 transition-colors text-left"
                style={idx < CURRENCIES.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.08)" } : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-8">{cur.symbol}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cur.label}</p>
                    <p className="text-[11px] text-muted-foreground">{cur.code}</p>
                  </div>
                </div>
                {selectedCurrency === cur.code && (
                  <Check className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
