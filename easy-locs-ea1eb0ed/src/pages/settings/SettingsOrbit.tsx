/**
 * SettingsOrbit — Language & Region settings page
 * Route: /settings/orbit
 */
import type { Locale } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Check } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useUiEngine } from "@/hooks/useUiEngine";

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
  useUiEngine("settings-orbit");
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
    await setLocale(code as any);
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
    <SubPageShell title="Language & Region" onBack={() => navigate("/settings")} contentClassName="space-y-5">
        {/* Language */}
        <section>
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Language</h2>
          <div className="rounded-2xl overflow-hidden bg-card border border-border/10">
            {LANGUAGES.map((lang, idx) => (
              <button
                key={lang.code}
                onClick={() => saveLang(lang.code)}
                className={`w-full px-4 py-3.5 flex items-center justify-between active:bg-muted/30 transition-colors text-left${idx < LANGUAGES.length - 1 ? " border-b border-border/8" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{lang.label}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">{lang.native}</p>
                </div>
                {selectedLang === lang.code && (
                  <Check className="w-4 h-4 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Currency */}
        <section>
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Currency</h2>
          <div className="rounded-2xl overflow-hidden bg-card border border-border/10">
            {CURRENCIES.map((cur, idx) => (
              <button
                key={cur.code}
                onClick={() => saveCurrency(cur.code)}
                className={`w-full px-4 py-3.5 flex items-center justify-between active:bg-muted/30 transition-colors text-left${idx < CURRENCIES.length - 1 ? " border-b border-border/8" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-8">{cur.symbol}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cur.label}</p>
                    <p className="text-[0.6875rem] text-muted-foreground">{cur.code}</p>
                  </div>
                </div>
                {selectedCurrency === cur.code && (
                  <Check className="w-4 h-4 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>
        </section>
    </SubPageShell>
  );
}
