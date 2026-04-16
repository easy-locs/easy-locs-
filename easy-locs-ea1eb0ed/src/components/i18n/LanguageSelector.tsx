import { useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { APP_LOCALES, type AppLocale } from "@/lib/i18n-locales";
import { RTL_LOCALES } from "@/lib/i18n-advanced";
import { localeSwitchPipeline } from "@/domains/i18n/pipelines/locale-switch.pipeline";

const LOCALE_DISPLAY: Record<string, { nativeName: string; flag: string }> = {
  en: { nativeName: "English", flag: "🇺🇸" },
  fr: { nativeName: "Français", flag: "🇫🇷" },
  ar: { nativeName: "العربية", flag: "🇦🇪" },
  es: { nativeName: "Español", flag: "🇪🇸" },
  pt: { nativeName: "Português", flag: "🇧🇷" },
  tr: { nativeName: "Türkçe", flag: "🇹🇷" },
  de: { nativeName: "Deutsch", flag: "🇩🇪" },
  zh: { nativeName: "中文", flag: "🇨🇳" },
  ja: { nativeName: "日本語", flag: "🇯🇵" },
  ko: { nativeName: "한국어", flag: "🇰🇷" },
  hi: { nativeName: "हिन्दी", flag: "🇮🇳" },
  ru: { nativeName: "Русский", flag: "🇷🇺" },
  it: { nativeName: "Italiano", flag: "🇮🇹" },
  nl: { nativeName: "Nederlands", flag: "🇳🇱" },
  sv: { nativeName: "Svenska", flag: "🇸🇪" },
  pl: { nativeName: "Polski", flag: "🇵🇱" },
  th: { nativeName: "ไทย", flag: "🇹🇭" },
  vi: { nativeName: "Tiếng Việt", flag: "🇻🇳" },
  id: { nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  ms: { nativeName: "Bahasa Melayu", flag: "🇲🇾" },
  he: { nativeName: "עברית", flag: "🇮🇱" },
  fa: { nativeName: "فارسی", flag: "🇮🇷" },
  ur: { nativeName: "اردو", flag: "🇵🇰" },
  bn: { nativeName: "বাংলা", flag: "🇧🇩" },
  tl: { nativeName: "Filipino", flag: "🇵🇭" },
};

function getLocalizedName(locale: string, displayLocale: string): string {
  try {
    const dn = new Intl.DisplayNames([displayLocale], { type: "language" });
    return dn.of(locale) || locale;
  } catch {
    return LOCALE_DISPLAY[locale]?.nativeName || locale;
  }
}

const PRIMARY_LOCALES: AppLocale[] = ["en", "fr", "ar", "es", "pt", "tr", "de", "zh"];

interface LanguageSelectorProps {
  variant?: "dropdown" | "list";
  showAllLocales?: boolean;
}

export default function LanguageSelector({
  variant = "dropdown",
  showAllLocales = false,
}: LanguageSelectorProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  const locales = showAllLocales ? APP_LOCALES : PRIMARY_LOCALES;

  const handleSelect = async (newLocale: string) => {
    await localeSwitchPipeline(newLocale);
    setOpen(false);
  };

  const currentDisplay = LOCALE_DISPLAY[locale];
  const isRtl = RTL_LOCALES.has(locale);

  if (variant === "list") {
    return (
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2">
          {t("i18n.select_language") || "Select Language"}
        </h3>
        {locales.map((loc) => {
          const display = LOCALE_DISPLAY[loc];
          const localizedName = getLocalizedName(loc, locale);
          const isActive = loc === locale;
          const locIsRtl = RTL_LOCALES.has(loc);

          return (
            <button
              key={loc}
              onClick={() => handleSelect(loc)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/30 border border-transparent"
              }`}
              dir={locIsRtl ? "rtl" : "ltr"}
            >
              <span className="text-lg shrink-0">{display?.flag || "🌐"}</span>
              <div className="flex-1 text-start min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {display?.nativeName || loc}
                </p>
                {localizedName !== (display?.nativeName || loc) && (
                  <p className="text-[0.625rem] text-muted-foreground truncate">
                    {localizedName}
                  </p>
                )}
              </div>
              {isActive && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
              {locIsRtl && (
                <span className="text-[0.5625rem] font-medium px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground shrink-0">
                  RTL
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/20 bg-card/60 text-sm font-medium text-foreground active:scale-[0.98] transition-all"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span>{currentDisplay?.flag || "🌐"}</span>
        <span className="hidden sm:inline">{currentDisplay?.nativeName || locale}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full mt-1 end-0 z-50 min-w-[200px] max-h-[300px] overflow-y-auto rounded-xl border border-border/20 bg-card shadow-lg p-1">
            {locales.map((loc) => {
              const display = LOCALE_DISPLAY[loc];
              const isActive = loc === locale;

              return (
                <button
                  key={loc}
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span className="text-base">{display?.flag || "🌐"}</span>
                  <span className="flex-1 truncate">{display?.nativeName || loc}</span>
                  {isActive && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
