import { useCallback, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { LOCALE_LABELS } from "@/lib/i18n-locales";
import { Globe, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  locale: Locale;
  supportedLocales: Locale[];
  onChange: (l: Locale) => void;
}

const PublicLanguageSwitcher = ({ locale, supportedLocales, onChange }: Props) => {
  const [announcement, setAnnouncement] = useState("");

  const currentLabel = LOCALE_LABELS[locale] || locale.toUpperCase();

  const handleSelect = useCallback(
    (l: Locale) => {
      onChange(l);
      const label = LOCALE_LABELS[l] || l.toUpperCase();
      setAnnouncement(`Language changed to ${label}`);
    },
    [onChange],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Change language, currently ${currentLabel}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="truncate max-w-[10rem]">{currentLabel}</span>
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto min-w-[10rem]">
          {supportedLocales.map((l) => {
            const label = LOCALE_LABELS[l] || l.toUpperCase();
            const selected = l === locale;
            return (
              <DropdownMenuItem
                key={l}
                onClick={() => handleSelect(l)}
                aria-checked={selected}
                role="menuitemradio"
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer"
              >
                <span>{label}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
};

export default PublicLanguageSwitcher;
