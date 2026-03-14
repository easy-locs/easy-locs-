/**
 * Orbit Payments — Type Definitions
 * Smart payment system with QR, in-chat, and context-aware payments.
 */

/** Payment method selection */
export type PaymentMethod = "fiat" | "locs";

/** Supported context types for contextual payments */
export type PaymentContextType =
  | "thread"
  | "listing"
  | "service"
  | "booking"
  | "property"
  | "concierge"
  | "standalone";

/** Payment context linking */
export interface PaymentContext {
  type: PaymentContextType;
  id: string;
  label?: string;
}

/** QR code types */
export type QRType = "static" | "dynamic";

/** Static QR payload — for profiles, businesses, providers */
export interface StaticQRPayload {
  qr_type: "static";
  version: 1;
  recipient_user_id: string;
  recipient_name: string;
  recipient_type: "user" | "business" | "provider" | "store";
  org_id?: string;
  created_at: string;
}

/** Dynamic QR payload — for specific payment requests */
export interface DynamicQRPayload {
  qr_type: "dynamic";
  version: 1;
  recipient_user_id: string;
  recipient_name: string;
  amount: number;
  currency: string;
  locs_equivalent?: number;
  reference_type?: PaymentContextType;
  reference_id?: string;
  description?: string;
  expires_at: string;
  nonce: string;
  signature: string;
}

export type QRPayload = StaticQRPayload | DynamicQRPayload;

/** FX conversion preview */
export interface FXPreview {
  original_amount: number;
  original_currency: string;
  fx_rate_used: number;
  amount_in_eur: number;
  margin_applied: number;
  spread_amount: number;
  locs_amount: number;
  fx_source: string;
  fx_timestamp: string;
}

/** Smart payment form state */
export interface PaymentFormState {
  recipientUserId: string;
  recipientName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  description: string;
  context?: PaymentContext;
  threadId?: string;
}

/** Payment action types available in Orbit */
export type OrbitPaymentAction =
  | "pay"
  | "request"
  | "scan_qr"
  | "my_qr"
  | "wallet"
  | "history";

/** Detected currency info */
export interface DetectedCurrency {
  code: string;
  symbol: string;
  name: string;
}

/** Currency entry */
export interface CurrencyInfo {
  symbol: string;
  name: string;
  region?: string;
}

/** Featured currencies shown as quick-access chips */
export const FEATURED_CURRENCIES = ["EUR", "USD", "AED", "CNY", "JPY"] as const;

/** Full 120+ currency map */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  // ── Featured ──────────────────────────────────
  EUR: { symbol: "€", name: "Euro", region: "Europe" },
  USD: { symbol: "$", name: "US Dollar", region: "Americas" },
  AED: { symbol: "د.إ", name: "UAE Dirham", region: "Middle East" },
  CNY: { symbol: "¥", name: "Chinese Yuan", region: "Asia" },
  JPY: { symbol: "¥", name: "Japanese Yen", region: "Asia" },

  // ── Europe ────────────────────────────────────
  GBP: { symbol: "£", name: "British Pound", region: "Europe" },
  CHF: { symbol: "CHF", name: "Swiss Franc", region: "Europe" },
  SEK: { symbol: "kr", name: "Swedish Krona", region: "Europe" },
  NOK: { symbol: "kr", name: "Norwegian Krone", region: "Europe" },
  DKK: { symbol: "kr", name: "Danish Krone", region: "Europe" },
  PLN: { symbol: "zł", name: "Polish Zloty", region: "Europe" },
  CZK: { symbol: "Kč", name: "Czech Koruna", region: "Europe" },
  HUF: { symbol: "Ft", name: "Hungarian Forint", region: "Europe" },
  RON: { symbol: "lei", name: "Romanian Leu", region: "Europe" },
  BGN: { symbol: "лв", name: "Bulgarian Lev", region: "Europe" },
  HRK: { symbol: "kn", name: "Croatian Kuna", region: "Europe" },
  ISK: { symbol: "kr", name: "Icelandic Króna", region: "Europe" },
  RSD: { symbol: "дин", name: "Serbian Dinar", region: "Europe" },
  UAH: { symbol: "₴", name: "Ukrainian Hryvnia", region: "Europe" },
  GEL: { symbol: "₾", name: "Georgian Lari", region: "Europe" },
  MDL: { symbol: "L", name: "Moldovan Leu", region: "Europe" },
  ALL: { symbol: "L", name: "Albanian Lek", region: "Europe" },
  MKD: { symbol: "ден", name: "Macedonian Denar", region: "Europe" },
  BAM: { symbol: "KM", name: "Convertible Mark", region: "Europe" },
  BYN: { symbol: "Br", name: "Belarusian Ruble", region: "Europe" },
  RUB: { symbol: "₽", name: "Russian Ruble", region: "Europe" },

  // ── Americas ──────────────────────────────────
  CAD: { symbol: "C$", name: "Canadian Dollar", region: "Americas" },
  MXN: { symbol: "MX$", name: "Mexican Peso", region: "Americas" },
  BRL: { symbol: "R$", name: "Brazilian Real", region: "Americas" },
  ARS: { symbol: "AR$", name: "Argentine Peso", region: "Americas" },
  CLP: { symbol: "CL$", name: "Chilean Peso", region: "Americas" },
  COP: { symbol: "CO$", name: "Colombian Peso", region: "Americas" },
  PEN: { symbol: "S/", name: "Peruvian Sol", region: "Americas" },
  UYU: { symbol: "$U", name: "Uruguayan Peso", region: "Americas" },
  BOB: { symbol: "Bs", name: "Bolivian Boliviano", region: "Americas" },
  PYG: { symbol: "₲", name: "Paraguayan Guarani", region: "Americas" },
  VES: { symbol: "Bs.S", name: "Venezuelan Bolívar", region: "Americas" },
  DOP: { symbol: "RD$", name: "Dominican Peso", region: "Americas" },
  CRC: { symbol: "₡", name: "Costa Rican Colón", region: "Americas" },
  GTQ: { symbol: "Q", name: "Guatemalan Quetzal", region: "Americas" },
  HNL: { symbol: "L", name: "Honduran Lempira", region: "Americas" },
  NIO: { symbol: "C$", name: "Nicaraguan Córdoba", region: "Americas" },
  PAB: { symbol: "B/.", name: "Panamanian Balboa", region: "Americas" },
  JMD: { symbol: "J$", name: "Jamaican Dollar", region: "Americas" },
  TTD: { symbol: "TT$", name: "Trinidad Dollar", region: "Americas" },
  BBD: { symbol: "Bds$", name: "Barbadian Dollar", region: "Americas" },
  BSD: { symbol: "B$", name: "Bahamian Dollar", region: "Americas" },
  HTG: { symbol: "G", name: "Haitian Gourde", region: "Americas" },

  // ── Middle East ───────────────────────────────
  SAR: { symbol: "﷼", name: "Saudi Riyal", region: "Middle East" },
  QAR: { symbol: "﷼", name: "Qatari Riyal", region: "Middle East" },
  KWD: { symbol: "د.ك", name: "Kuwaiti Dinar", region: "Middle East" },
  BHD: { symbol: "BD", name: "Bahraini Dinar", region: "Middle East" },
  OMR: { symbol: "﷼", name: "Omani Rial", region: "Middle East" },
  JOD: { symbol: "JD", name: "Jordanian Dinar", region: "Middle East" },
  IQD: { symbol: "ع.د", name: "Iraqi Dinar", region: "Middle East" },
  LBP: { symbol: "ل.ل", name: "Lebanese Pound", region: "Middle East" },
  ILS: { symbol: "₪", name: "Israeli Shekel", region: "Middle East" },
  TRY: { symbol: "₺", name: "Turkish Lira", region: "Middle East" },
  IRR: { symbol: "﷼", name: "Iranian Rial", region: "Middle East" },
  SYP: { symbol: "£S", name: "Syrian Pound", region: "Middle East" },
  YER: { symbol: "﷼", name: "Yemeni Rial", region: "Middle East" },

  // ── Africa ────────────────────────────────────
  MAD: { symbol: "د.م.", name: "Moroccan Dirham", region: "Africa" },
  TND: { symbol: "DT", name: "Tunisian Dinar", region: "Africa" },
  DZD: { symbol: "د.ج", name: "Algerian Dinar", region: "Africa" },
  EGP: { symbol: "E£", name: "Egyptian Pound", region: "Africa" },
  NGN: { symbol: "₦", name: "Nigerian Naira", region: "Africa" },
  ZAR: { symbol: "R", name: "South African Rand", region: "Africa" },
  KES: { symbol: "KSh", name: "Kenyan Shilling", region: "Africa" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi", region: "Africa" },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling", region: "Africa" },
  UGX: { symbol: "USh", name: "Ugandan Shilling", region: "Africa" },
  ETB: { symbol: "Br", name: "Ethiopian Birr", region: "Africa" },
  XOF: { symbol: "CFA", name: "CFA Franc BCEAO", region: "Africa" },
  XAF: { symbol: "FCFA", name: "CFA Franc BEAC", region: "Africa" },
  RWF: { symbol: "FRw", name: "Rwandan Franc", region: "Africa" },
  MGA: { symbol: "Ar", name: "Malagasy Ariary", region: "Africa" },
  MUR: { symbol: "₨", name: "Mauritian Rupee", region: "Africa" },
  BWP: { symbol: "P", name: "Botswana Pula", region: "Africa" },
  MZN: { symbol: "MT", name: "Mozambican Metical", region: "Africa" },
  AOA: { symbol: "Kz", name: "Angolan Kwanza", region: "Africa" },
  CDF: { symbol: "FC", name: "Congolese Franc", region: "Africa" },
  SCR: { symbol: "₨", name: "Seychellois Rupee", region: "Africa" },
  GMD: { symbol: "D", name: "Gambian Dalasi", region: "Africa" },
  CVE: { symbol: "Esc", name: "Cape Verdean Escudo", region: "Africa" },
  SZL: { symbol: "E", name: "Swazi Lilangeni", region: "Africa" },
  LSL: { symbol: "M", name: "Lesotho Loti", region: "Africa" },
  NAD: { symbol: "N$", name: "Namibian Dollar", region: "Africa" },
  ZMW: { symbol: "ZK", name: "Zambian Kwacha", region: "Africa" },
  MWK: { symbol: "MK", name: "Malawian Kwacha", region: "Africa" },
  SDG: { symbol: "£SD", name: "Sudanese Pound", region: "Africa" },
  LYD: { symbol: "LD", name: "Libyan Dinar", region: "Africa" },

  // ── Asia-Pacific ──────────────────────────────
  INR: { symbol: "₹", name: "Indian Rupee", region: "Asia-Pacific" },
  KRW: { symbol: "₩", name: "South Korean Won", region: "Asia-Pacific" },
  SGD: { symbol: "S$", name: "Singapore Dollar", region: "Asia-Pacific" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar", region: "Asia-Pacific" },
  TWD: { symbol: "NT$", name: "Taiwan Dollar", region: "Asia-Pacific" },
  THB: { symbol: "฿", name: "Thai Baht", region: "Asia-Pacific" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit", region: "Asia-Pacific" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah", region: "Asia-Pacific" },
  PHP: { symbol: "₱", name: "Philippine Peso", region: "Asia-Pacific" },
  VND: { symbol: "₫", name: "Vietnamese Dong", region: "Asia-Pacific" },
  PKR: { symbol: "₨", name: "Pakistani Rupee", region: "Asia-Pacific" },
  BDT: { symbol: "৳", name: "Bangladeshi Taka", region: "Asia-Pacific" },
  LKR: { symbol: "₨", name: "Sri Lankan Rupee", region: "Asia-Pacific" },
  NPR: { symbol: "₨", name: "Nepalese Rupee", region: "Asia-Pacific" },
  MMK: { symbol: "K", name: "Myanmar Kyat", region: "Asia-Pacific" },
  KHR: { symbol: "៛", name: "Cambodian Riel", region: "Asia-Pacific" },
  LAK: { symbol: "₭", name: "Lao Kip", region: "Asia-Pacific" },
  MNT: { symbol: "₮", name: "Mongolian Tugrik", region: "Asia-Pacific" },
  KZT: { symbol: "₸", name: "Kazakhstani Tenge", region: "Asia-Pacific" },
  UZS: { symbol: "сўм", name: "Uzbekistani Som", region: "Asia-Pacific" },
  AZN: { symbol: "₼", name: "Azerbaijani Manat", region: "Asia-Pacific" },
  TMT: { symbol: "T", name: "Turkmen Manat", region: "Asia-Pacific" },
  KGS: { symbol: "сом", name: "Kyrgyz Som", region: "Asia-Pacific" },
  TJS: { symbol: "SM", name: "Tajikistani Somoni", region: "Asia-Pacific" },
  AFN: { symbol: "؋", name: "Afghan Afghani", region: "Asia-Pacific" },

  // ── Oceania ───────────────────────────────────
  AUD: { symbol: "A$", name: "Australian Dollar", region: "Oceania" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", region: "Oceania" },
  FJD: { symbol: "FJ$", name: "Fijian Dollar", region: "Oceania" },
  PGK: { symbol: "K", name: "Papua New Guinean Kina", region: "Oceania" },
  WST: { symbol: "T", name: "Samoan Tala", region: "Oceania" },
  TOP: { symbol: "T$", name: "Tongan Paʻanga", region: "Oceania" },
};

/** Get unique region list */
export function getCurrencyRegions(): string[] {
  const regions = new Set<string>();
  Object.values(SUPPORTED_CURRENCIES).forEach((c) => {
    if (c.region) regions.add(c.region);
  });
  return Array.from(regions);
}

/** Get currencies by region */
export function getCurrenciesByRegion(region: string): [string, CurrencyInfo][] {
  return Object.entries(SUPPORTED_CURRENCIES).filter(([, info]) => info.region === region);
}
