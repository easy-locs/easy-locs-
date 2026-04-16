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

const PublicLanguageSwitcher = ({ locale, supportedLocales, onChange }: Props) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
        <Globe className="h-4 w-4" />
        <span className="truncate max-w-[10rem]">{LOCALE_LABELS[locale] || locale.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto min-w-[10rem]">
      {supportedLocales.map((l) => (
        <DropdownMenuItem
          key={l}
          onClick={() => onChange(l)}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer"
        >
          <span>{LOCALE_LABELS[l] || l.toUpperCase()}</span>
          {l === locale && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default PublicLanguageSwitcher;
