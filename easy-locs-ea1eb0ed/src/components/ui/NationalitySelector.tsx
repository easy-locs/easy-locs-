/**
 * NationalitySelector — Searchable nationality picker.
 */
import { useMemo } from "react";
import { SearchableSelector, type SelectorOption } from "./SearchableSelector";
import { NATIONALITIES } from "@/lib/data/nationalities";
import { COUNTRIES } from "@/lib/data/countries";

interface Props {
  value?: string | null;
  onChange: (nationality: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function NationalitySelector({ value, onChange, label = "Nationality", placeholder = "Select nationality", className }: Props) {
  const options: SelectorOption[] = useMemo(() =>
    NATIONALITIES.map((n) => {
      const country = COUNTRIES.find((c) => c.code === n.country_code);
      return {
        value: n.name,
        label: n.name,
        sublabel: n.country_code,
        icon: country ? <span className="text-base">{country.flag}</span> : undefined,
      };
    }),
  []);

  return (
    <SearchableSelector
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search nationalities…"
      className={className}
    />
  );
}
