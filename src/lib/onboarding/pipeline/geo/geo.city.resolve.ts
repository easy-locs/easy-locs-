/**
 * geo.city.resolve — Resolves city name with timezone/zone awareness.
 * ONE thing: clean and validate city name.
 */

const CITY_ZONES: Record<string, { zone: string; country: string }> = {
  dubai: { zone: "dubai", country: "AE" },
  "abu dhabi": { zone: "abu_dhabi", country: "AE" },
  sharjah: { zone: "sharjah", country: "AE" },
  ajman: { zone: "ajman", country: "AE" },
  riyadh: { zone: "riyadh", country: "SA" },
  jeddah: { zone: "jeddah", country: "SA" },
  makkah: { zone: "makkah", country: "SA" },
  madinah: { zone: "madinah", country: "SA" },
  cairo: { zone: "cairo", country: "EG" },
  alexandria: { zone: "alexandria", country: "EG" },
  casablanca: { zone: "casablanca", country: "MA" },
  marrakech: { zone: "marrakech", country: "MA" },
  paris: { zone: "paris", country: "FR" },
  london: { zone: "london", country: "GB" },
  istanbul: { zone: "istanbul", country: "TR" },
  doha: { zone: "doha", country: "QA" },
  muscat: { zone: "muscat", country: "OM" },
  manama: { zone: "manama", country: "BH" },
  amman: { zone: "amman", country: "JO" },
};

export function resolveCity(raw: string | null | undefined): {
  city: string | null;
  zone: string | null;
  countryHint: string | null;
} {
  if (!raw?.trim()) return { city: null, zone: null, countryHint: null };
  const key = raw.trim().toLowerCase();
  const match = CITY_ZONES[key];
  if (match) {
    return {
      city: raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase(),
      zone: match.zone,
      countryHint: match.country,
    };
  }
  return {
    city: raw.trim(),
    zone: null,
    countryHint: null,
  };
}
