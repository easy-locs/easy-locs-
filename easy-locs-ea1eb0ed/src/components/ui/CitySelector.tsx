/**
 * CitySelector — Searchable city picker, optionally filtered by country.
 */
import { useMemo } from "react";
import { SearchableSelector, type SelectorOption } from "./SearchableSelector";
import { CITIES } from "@/lib/data/cities";

interface Props {
  value?: string | null;
  onChange: (cityName: string) => void;
  countryCode?: string | null;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function CitySelector({ value, onChange, countryCode, label = "City", placeholder = "Select city", className }: Props) {
  const options: SelectorOption[] = useMemo(() => {
    const filtered = countryCode
      ? CITIES.filter((c) => c.country_code === countryCode)
      : CITIES;
    return filtered.map((c) => ({
      value: c.name,
      label: c.name,
      sublabel: c.region ? `${c.region} · ${c.country_code}` : c.country_code,
    }));
  }, [countryCode]);

  return (
    <SearchableSelector
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search cities…"
      className={className}
    />
  );
}
