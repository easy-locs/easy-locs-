export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function dedupeStrings(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter(Boolean).map((v) => String(v).trim()))];
}

export function safeText(input?: string | null): string | null {
  const v = (input ?? "").trim();
  return v.length ? v : null;
}

export function buildMerchantSearchKey(params: {
  merchantName: string;
  city: string;
  countryCode: string;
  phone?: string | null;
}) {
  return [
    slugify(params.merchantName),
    slugify(params.city),
    params.countryCode.toUpperCase(),
    (params.phone ?? "").replace(/\D/g, ""),
  ].join(":");
}
