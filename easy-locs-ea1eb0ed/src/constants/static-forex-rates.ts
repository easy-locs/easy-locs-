export const STATIC_RATES_TO_EUR: Record<string, number> = {
  EUR: 1, GBP: 1.17, CHF: 1.05, SEK: 0.089, DKK: 0.134, NOK: 0.087,
  PLN: 0.233, CZK: 0.040, HUF: 0.0026, RON: 0.201, BGN: 0.511,
  ISK: 0.0067, RSD: 0.0085, UAH: 0.024, GEL: 0.35, MDL: 0.052,
  ALL: 0.0097, MKD: 0.016, BAM: 0.511, HRK: 0.133,
  USD: 0.92, CAD: 0.68, MXN: 0.054, BRL: 0.175, ARS: 0.0010,
  CLP: 0.0010, COP: 0.00023, PEN: 0.25, UYU: 0.023, BOB: 0.133,
  PYG: 0.00012, DOP: 0.016, CRC: 0.0018, GTQ: 0.12, HNL: 0.037,
  NIO: 0.025, PAB: 0.92, JMD: 0.006, TTD: 0.135, BBD: 0.46,
  BSD: 0.92, BZD: 0.46, GYD: 0.0044, SRD: 0.027, HTG: 0.007,
  VES: 0.025,
  ZAR: 0.051, NGN: 0.00060, KES: 0.0060, GHS: 0.063, MAD: 0.092,
  TND: 0.300, DZD: 0.0068, XOF: 0.00153, XAF: 0.00153, EGP: 0.019,
  ETB: 0.016, TZS: 0.00036, UGX: 0.00024, MGA: 0.00020, MUR: 0.020,
  MWK: 0.00053, ZMW: 0.034, BWP: 0.068, NAD: 0.051, SZL: 0.051,
  LSL: 0.051, SCR: 0.067, GMD: 0.013, CVE: 0.0091, STN: 0.041,
  RWF: 0.00072, BIF: 0.00032, DJF: 0.0052, ERN: 0.061, SOS: 0.0016,
  SDG: 0.0015, LYD: 0.19, AOA: 0.0011, CDF: 0.00033, MZN: 0.014,
  MRU: 0.024,
  AED: 0.250, SAR: 0.245, QAR: 0.253, BHD: 2.44, KWD: 2.99,
  OMR: 2.39, JOD: 1.30, ILS: 0.25, LBP: 0.000010, IQD: 0.00070,
  SYP: 0.00037, YER: 0.0037,
  TRY: 0.028,
  JPY: 0.0062, CNY: 0.127, INR: 0.011, KRW: 0.00069, SGD: 0.69,
  MYR: 0.21, THB: 0.026, VND: 0.000037, PHP: 0.016, IDR: 0.000058,
  TWD: 0.029, HKD: 0.118, BDT: 0.0076, PKR: 0.0033, LKR: 0.0030,
  NPR: 0.0069, MMK: 0.00044, KHR: 0.00023, LAK: 0.000043, BND: 0.69,
  MNT: 0.00027, KZT: 0.0019, UZS: 0.000073, AZN: 0.54, AMD: 0.0024,
  KGS: 0.010, TJS: 0.084, TMT: 0.26, AFN: 0.013, MVR: 0.060,
  AUD: 0.61, NZD: 0.56, FJD: 0.41, PGK: 0.23, WST: 0.34, TOP: 0.39,
  VUV: 0.0078, SBD: 0.11, XPF: 0.0084,
  CUP: 0.038, AWG: 0.51, ANG: 0.51, KYD: 1.12, BMD: 0.92,
  XCD: 0.34,
};

export function buildStaticSnapshot(): {
  base: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: string;
} {
  const rates: Record<string, number> = {};
  for (const [currency, toEur] of Object.entries(STATIC_RATES_TO_EUR)) {
    if (currency === "EUR") continue;
    rates[currency] = 1 / toEur;
  }
  return {
    base: "EUR",
    rates,
    source: "static",
    fetchedAt: new Date().toISOString(),
  };
}
