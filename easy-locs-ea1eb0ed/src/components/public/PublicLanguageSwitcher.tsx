import type { Locale } from "@/lib/i18n";
import { LOCALE_LABELS } from "@/lib/i18n-locales";
import { Globe } from "lucide-react";

interface Props {
  locale: Locale;
  supportedLocales: Locale[];
  onChange: (l: Locale) => void;
}

const PublicLanguageSwitcher = ({ locale, supportedLocales, onChange }: Props) => (
  <div className="flex items-center gap-1.5">
    <Globe className="h-4 w-4 text-muted-foreground" />
    <div className="flex gap-0.5">
      {supportedLocales.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
            l === locale
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {LOCALE_LABELS[l] || l.toUpperCase()}
        </button>
      ))}
    </div>
  </div>
);

export default PublicLanguageSwitcher;
