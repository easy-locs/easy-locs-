/**
 * CountrySelector — Searchable country picker using centralized dataset.
 */
import { useMemo } from "react";
import { SearchableSelector, type SelectorOption } from "./SearchableSelector";
import { COUNTRIES } from "@/lib/data/countries";

interface Props {
  value?: string | null;
  onChange: (code: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function CountrySelector({ value, onChange, label = "Country", placeholder = "Select country", className }: Props) {
  const options: SelectorOption[] = useMemo(() =>
    COUNTRIES.map((c) => ({
      value: c.code,
      label: c.name,
      sublabel: `${c.flag} ${c.dialCode} · ${c.currency}`,
      icon: <span className="text-base">{c.flag}</span>,
    })),
  []);

  return (
    <SearchableSelector
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search countries…"
      className={className}
    />
  );
}
