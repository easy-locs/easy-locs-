import { useState, useEffect, useCallback } from "react";
import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";

// Static approximate rates relative to EUR (updated periodically)
const RATES_TO_EUR: Record<string, number> = {
  EUR: 1, USD: 0.92, GBP: 1.17, CHF: 1.05, CAD: 0.68, AUD: 0.61,
  SEK: 0.089, DKK: 0.134, NOK: 0.087, PLN: 0.233, CZK: 0.040,
  HUF: 0.0026, RON: 0.201, BGN: 0.511, BRL: 0.175, MXN: 0.054,
  MAD: 0.092, TND: 0.300, XOF: 0.00153, ZAR: 0.051, AED: 0.250,
  SAR: 0.245, TRY: 0.028, JPY: 0.0062, SGD: 0.69,
  NZD: 0.56, ARS: 0.0010, CLP: 0.0010, COP: 0.00023,
};

export const useCurrencyConversion = (userCountry: string = "FR") => {
  const baseCurrency = COUNTRY_CURRENCY_MAP[userCountry] || "EUR";

  const convert = useCallback((amount: number, fromCurrency: string, toCurrency?: string) => {
    const target = toCurrency || baseCurrency;
    if (fromCurrency === target) return amount;
    const fromRate = RATES_TO_EUR[fromCurrency] || 1;
    const toRate = RATES_TO_EUR[target] || 1;
    // Convert: amount in fromCurrency → EUR → toCurrency
    const amountInEur = amount * fromRate;
    return Math.round((amountInEur / toRate) * 100) / 100;
  }, [baseCurrency]);

  const formatCurrency = useCallback((amount: number, currency?: string) => {
    const cur = currency || baseCurrency;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${cur}`;
    }
  }, [baseCurrency]);

  return { baseCurrency, convert, formatCurrency };
};
