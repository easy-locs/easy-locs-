import * as Comlink from "comlink";

export interface NormalizationWorkerAPI {
  normalizeListings(
    listings: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
  normalizeAddresses(
    addresses: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
  deduplicateByKey(
    items: Record<string, unknown>[],
    key: string,
  ): Promise<Record<string, unknown>[]>;
  normalizePhoneNumbers(
    phones: string[],
    defaultCountryCode?: string,
  ): Promise<string[]>;
  normalizeCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
  ): Promise<{ amount: number; formatted: string }>;
}

function cleanString(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
}

function capitalizeWords(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeListingType(type: unknown): string {
  const t = String(type ?? "").toLowerCase().trim();
  const map: Record<string, string> = {
    rent: "rental",
    rental: "rental",
    location: "rental",
    sale: "sale",
    vente: "sale",
    sell: "sale",
    seasonal: "seasonal_rental",
    seasonal_rental: "seasonal_rental",
    short_term: "seasonal_rental",
    colocation: "colocation",
    coloc: "colocation",
    shared: "colocation",
    commercial: "commercial",
    bureau: "commercial",
    office: "commercial",
  };
  return map[t] ?? "rental";
}

const api: NormalizationWorkerAPI = {
  async normalizeListings(listings) {
    return listings.map((listing) => ({
      ...listing,
      title: capitalizeWords(cleanString(listing.title)),
      description: cleanString(listing.description),
      listing_type: normalizeListingType(listing.listing_type),
      price: typeof listing.price === "number" ? Math.round(listing.price * 100) / 100 : 0,
      city: capitalizeWords(cleanString(listing.city)),
      country: cleanString(listing.country)?.toUpperCase().slice(0, 2) || null,
      normalized_at: new Date().toISOString(),
    }));
  },

  async normalizeAddresses(addresses) {
    return addresses.map((addr) => ({
      ...addr,
      street: capitalizeWords(cleanString(addr.street)),
      city: capitalizeWords(cleanString(addr.city)),
      state: cleanString(addr.state)?.toUpperCase() || null,
      postal_code: cleanString(addr.postal_code)?.replace(/\s/g, "") || null,
      country: cleanString(addr.country)?.toUpperCase().slice(0, 2) || null,
    }));
  },

  async deduplicateByKey(items, key) {
    const seen = new Set<unknown>();
    return items.filter((item) => {
      const val = item[key];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  },

  async normalizePhoneNumbers(phones, defaultCountryCode = "+33") {
    return phones.map((phone) => {
      let cleaned = phone.replace(/[\s\-().]/g, "");
      if (cleaned.startsWith("0") && cleaned.length >= 9) {
        cleaned = defaultCountryCode + cleaned.slice(1);
      }
      if (!cleaned.startsWith("+")) {
        cleaned = defaultCountryCode + cleaned;
      }
      return cleaned;
    });
  },

  async normalizeCurrency(amount, _fromCurrency, toCurrency, rate) {
    const converted = Math.round(amount * rate * 100) / 100;
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: toCurrency,
      minimumFractionDigits: 2,
    });
    return { amount: converted, formatted: formatter.format(converted) };
  },
};

Comlink.expose(api);
