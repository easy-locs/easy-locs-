/**
 * FX / Multi-Currency Engine — Manages exchange rate cache and currency conversion.
 */

// Static rates (production would fetch from API)
const BASE_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.67, MAD: 10.05,
  SAR: 3.75, QAR: 3.64, BHD: 0.377, KWD: 0.308, OMR: 0.385,
  EGP: 30.9, TND: 3.12, DZD: 134.5, TRY: 27.1, INR: 83.1,
  PKR: 278, BDT: 110, PHP: 56.2, IDR: 15600, MYR: 4.72,
  SGD: 1.34, JPY: 149, CNY: 7.24, KRW: 1330, THB: 35.8,
  CAD: 1.36, AUD: 1.53, NZD: 1.65, ZAR: 18.6, NGN: 780,
  KES: 153, GHS: 12.5, XOF: 605, XAF: 605,
};

let lastRefresh = Date.now();

export function convertCurrency(amount: number, from: string, to: string): number {
  const fromRate = BASE_RATES[from] ?? 1;
  const toRate = BASE_RATES[to] ?? 1;
  return Math.round((amount / fromRate) * toRate * 100) / 100;
}

export function getSupportedCurrencies(): string[] {
  return Object.keys(BASE_RATES);
}

export async function runFxRefresh() {
  // In production, fetch live rates here
  lastRefresh = Date.now();
  return { currencies: Object.keys(BASE_RATES).length, lastRefresh: new Date(lastRefresh).toISOString() };
}
