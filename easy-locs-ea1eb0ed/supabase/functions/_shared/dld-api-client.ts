const DLD_API_BASE_URL =
  Deno.env.get("DLD_API_URL") || "https://gateway.dubailand.gov.ae/open-data";

const DLD_API_KEY = Deno.env.get("DLD_API_KEY") || "";

const DLD_REQUEST_TIMEOUT_MS = 15_000;

export interface DLDApiRawTransaction {
  Transaction_Number?: string;
  transaction_number?: string;
  Transaction_Type?: string;
  transaction_type?: string;
  Property_Type?: string;
  property_type?: string;
  Area?: string;
  area?: string;
  Property_Sub_Type?: string;
  property_sub_type?: string;
  Amount?: number | string;
  amount?: number | string;
  Transaction_Date?: string;
  transaction_date?: string;
  Registration_Date?: string;
  registration_date?: string;
  Property_Size_sqft?: number | string;
  property_size_sqft?: number | string;
  Building_Name?: string;
  building_name?: string;
  Project_Name?: string;
  project_name?: string;
  Rooms?: number | string;
  rooms?: number | string;
  Buyer_Nationality?: string;
  buyer_nationality?: string;
  Is_Freehold?: boolean | string;
  is_freehold?: boolean | string;
  Developer?: string;
  developer?: string;
}

export interface NormalizedDLDTransaction {
  transaction_id: string;
  district: string;
  property_type: string;
  transaction_type: string;
  amount: number;
  area_sqft: number;
  price_per_sqft: number;
  bedrooms: number | null;
  building_name: string | null;
  developer: string | null;
  buyer_nationality: string | null;
  transaction_date: string;
  registration_date: string | null;
  metadata: Record<string, unknown>;
}

const PROPERTY_TYPE_MAP: Record<string, string> = {
  unit: "apartment",
  flat: "apartment",
  apartment: "apartment",
  villa: "villa",
  townhouse: "townhouse",
  penthouse: "penthouse",
  office: "office",
  "office space": "office",
  land: "land",
  plot: "land",
  "commercial land": "land",
  "residential land": "land",
  building: "apartment",
};

const TX_TYPE_MAP: Record<string, string> = {
  sales: "sale",
  sale: "sale",
  sell: "sale",
  mortgage: "mortgage",
  gift: "gift",
  grant: "gift",
};

const AREA_TO_DISTRICT: Record<string, string> = {
  "marina": "Dubai Marina",
  "dubai marina": "Dubai Marina",
  "downtown": "Downtown Dubai",
  "downtown dubai": "Downtown Dubai",
  "burj khalifa": "Downtown Dubai",
  "business bay": "Business Bay",
  "palm jumeirah": "Palm Jumeirah",
  "jumeirah village circle": "JVC",
  "jvc": "JVC",
  "jumeirah lake towers": "JLT",
  "jlt": "JLT",
  "dubai hills": "Dubai Hills",
  "dubai hills estate": "Dubai Hills",
  "arabian ranches": "Arabian Ranches",
  "difc": "DIFC",
  "dubai international financial centre": "DIFC",
  "jumeirah beach residence": "Jumeirah Beach Residence",
  "jbr": "Jumeirah Beach Residence",
  "dubai creek harbour": "Dubai Creek Harbour",
  "creek harbour": "Dubai Creek Harbour",
  "mbr city": "MBR City",
  "mohammed bin rashid city": "MBR City",
  "damac hills": "Damac Hills",
  "al barsha": "Al Barsha",
  "international city": "International City",
  "meydan": "Meydan",
  "town square": "Town Square",
  "dubai silicon oasis": "Dubai Silicon Oasis",
  "motor city": "Motor City",
  "dubai sports city": "Dubai Sports City",
  "discovery gardens": "Discovery Gardens",
  "al quoz": "Al Quoz",
  "dubailand": "Dubailand",
  "the greens": "The Greens",
  "the views": "The Views",
  "barsha heights": "Barsha Heights",
  "tecom": "Barsha Heights",
  "dubai production city": "Dubai Production City",
  "impz": "Dubai Production City",
  "remraam": "Remraam",
  "mudon": "Mudon",
  "tilal al ghaf": "Tilal Al Ghaf",
  "dubai south": "Dubai South",
  "emaar south": "Emaar South",
  "al furjan": "Al Furjan",
  "jumeirah village triangle": "Jumeirah Village Triangle",
  "jvt": "Jumeirah Village Triangle",
  "city walk": "City Walk",
  "la mer": "La Mer",
  "bluewaters": "Bluewaters",
  "dubai harbour": "Dubai Harbour",
  "sobha hartland": "Sobha Hartland",
  "jumeirah": "Jumeirah",
  "umm suqeim": "Umm Suqeim",
  "dubai investment park": "Dubai Investment Park",
  "dip": "Dubai Investment Park",
  "arjan": "Arjan",
  "al nahda": "Al Nahda",
};

function normalizeDistrict(area: string): string {
  const lower = area.toLowerCase().trim();
  if (AREA_TO_DISTRICT[lower]) return AREA_TO_DISTRICT[lower];
  for (const [key, val] of Object.entries(AREA_TO_DISTRICT)) {
    if (lower.includes(key)) return val;
  }
  return area.trim();
}

function normalizePropertyType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return PROPERTY_TYPE_MAP[lower] || "apartment";
}

function normalizeTransactionType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return TX_TYPE_MAP[lower] || "sale";
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getField<T>(raw: DLDApiRawTransaction, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const val = (raw as Record<string, unknown>)[k];
    if (val !== undefined && val !== null && val !== "") return val as T;
  }
  return undefined;
}

export function normalizeRawTransaction(raw: DLDApiRawTransaction): NormalizedDLDTransaction | null {
  const txNumber = getField<string>(raw, "Transaction_Number", "transaction_number");
  if (!txNumber) return null;

  const rawArea = getField<string>(raw, "Area", "area") || "";
  const rawPropertyType = getField<string>(raw, "Property_Type", "property_type", "Property_Sub_Type", "property_sub_type") || "apartment";
  const rawTxType = getField<string>(raw, "Transaction_Type", "transaction_type") || "sale";
  const rawAmount = Number(getField<number | string>(raw, "Amount", "amount") || 0);
  const rawAreaSqft = Number(getField<number | string>(raw, "Property_Size_sqft", "property_size_sqft") || 0);
  const rawDate = getField<string>(raw, "Transaction_Date", "transaction_date") || "";
  const rawRegDate = getField<string>(raw, "Registration_Date", "registration_date");
  const rawBuilding = getField<string>(raw, "Building_Name", "building_name");
  const rawRooms = getField<number | string>(raw, "Rooms", "rooms");
  const rawBuyerNat = getField<string>(raw, "Buyer_Nationality", "buyer_nationality");
  const rawDeveloper = getField<string>(raw, "Developer", "developer");

  if (rawAmount <= 0) return null;

  const areaSqft = rawAreaSqft > 0 ? rawAreaSqft : 1;
  const pricePerSqft = rawAreaSqft > 0 ? Math.round((rawAmount / rawAreaSqft) * 100) / 100 : 0;

  return {
    transaction_id: `DLD-${txNumber}`,
    district: normalizeDistrict(rawArea),
    property_type: normalizePropertyType(rawPropertyType),
    transaction_type: normalizeTransactionType(rawTxType),
    amount: rawAmount,
    area_sqft: areaSqft,
    price_per_sqft: pricePerSqft,
    bedrooms: rawRooms !== undefined ? Number(rawRooms) : null,
    building_name: rawBuilding || null,
    developer: rawDeveloper || null,
    buyer_nationality: rawBuyerNat || null,
    transaction_date: parseDate(rawDate),
    registration_date: rawRegDate ? parseDate(rawRegDate) : null,
    metadata: { source: "dld_api", raw_area: rawArea },
  };
}

export interface DLDApiFetchOptions {
  limit?: number;
  offset?: number;
  fromDate?: string;
  toDate?: string;
  area?: string;
  transactionType?: string;
}

export async function fetchDLDTransactions(
  options: DLDApiFetchOptions = {},
): Promise<{ transactions: NormalizedDLDTransaction[]; hasMore: boolean; total: number }> {
  if (!DLD_API_KEY) {
    throw new Error("DLD_API_KEY not configured");
  }

  const url = new URL(`${DLD_API_BASE_URL}/transactions`);
  if (options.limit) url.searchParams.set("limit", String(options.limit));
  if (options.offset) url.searchParams.set("offset", String(options.offset));
  if (options.fromDate) url.searchParams.set("from_date", options.fromDate);
  if (options.toDate) url.searchParams.set("to_date", options.toDate);
  if (options.area) url.searchParams.set("area", options.area);
  if (options.transactionType) url.searchParams.set("transaction_type", options.transactionType);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DLD_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${DLD_API_KEY}`,
        "X-Api-Key": DLD_API_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`DLD API returned ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const rawList: DLDApiRawTransaction[] = Array.isArray(json)
      ? json
      : json.data || json.results || json.transactions || [];

    const total = json.total || json.count || rawList.length;
    const normalized = rawList
      .map(normalizeRawTransaction)
      .filter((t): t is NormalizedDLDTransaction => t !== null);

    return {
      transactions: normalized,
      hasMore: (options.offset || 0) + rawList.length < total,
      total,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export function isDLDApiConfigured(): boolean {
  return Boolean(DLD_API_KEY);
}
