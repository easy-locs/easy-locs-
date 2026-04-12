const CITY_TIMEZONES: Record<string, string> = {
  "AE_dubai": "Asia/Dubai",
  "AE_abu_dhabi": "Asia/Dubai",
  "AE_sharjah": "Asia/Dubai",
  "FR_paris": "Europe/Paris",
  "FR_lyon": "Europe/Paris",
  "FR_marseille": "Europe/Paris",
  "US_new_york": "America/New_York",
  "US_los_angeles": "America/Los_Angeles",
  "US_chicago": "America/Chicago",
  "GB_london": "Europe/London",
  "GB_manchester": "Europe/London",
  "SA_riyadh": "Asia/Riyadh",
  "SA_jeddah": "Asia/Riyadh",
  "SA_makkah": "Asia/Riyadh",
  "EG_cairo": "Africa/Cairo",
  "EG_alexandria": "Africa/Cairo",
  "MA_casablanca": "Africa/Casablanca",
  "MA_marrakech": "Africa/Casablanca",
  "DE_berlin": "Europe/Berlin",
  "IN_mumbai": "Asia/Kolkata",
  "IN_delhi": "Asia/Kolkata",
  "BR_sao_paulo": "America/Sao_Paulo",
  "NG_lagos": "Africa/Lagos",
  "JP_tokyo": "Asia/Tokyo",
};

const COUNTRY_DEFAULT_TIMEZONES: Record<string, string> = {
  AE: "Asia/Dubai",
  FR: "Europe/Paris",
  US: "America/New_York",
  GB: "Europe/London",
  SA: "Asia/Riyadh",
  EG: "Africa/Cairo",
  MA: "Africa/Casablanca",
  DE: "Europe/Berlin",
  IN: "Asia/Kolkata",
  BR: "America/Sao_Paulo",
  NG: "Africa/Lagos",
  JP: "Asia/Tokyo",
};

export function resolveTimezone(country: string, city?: string): string {
  if (city) {
    const key = `${country.toUpperCase()}_${city.toLowerCase()}`;
    const tz = CITY_TIMEZONES[key];
    if (tz) return tz;
  }
  return COUNTRY_DEFAULT_TIMEZONES[country.toUpperCase()] ?? "UTC";
}

export function resolveLocalTime(country: string, city?: string): string {
  const tz = resolveTimezone(country, city);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

export function getTimezoneOffset(country: string, city?: string): number {
  const tz = resolveTimezone(country, city);
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    return (tzDate.getTime() - utcDate.getTime()) / 60_000;
  } catch {
    return 0;
  }
}

export function isMarketHours(country: string, city?: string): boolean {
  const tz = resolveTimezone(country, city);
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
      10,
    );
    const day = new Date().toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
    if (day === "Sat" || day === "Sun") return false;
    return hour >= 9 && hour < 17;
  } catch {
    return false;
  }
}
