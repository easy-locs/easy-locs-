import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wallet, ArrowRightLeft, Globe } from "lucide-react";
import { RATES_TO_EUR, computeExchangeRate } from "@/hooks/useCurrencyConversion";

interface CurrencyBalance {
  currency: string;
  amount: number;
  orderCount: number;
}

interface Props {
  /** Orders with currency and total_price fields */
  orders: Array<{ currency: string; total_price: number; payment_status: string; status: string }>;
  /** User's preferred currency for reporting */
  preferredCurrency: string;
  onPreferredCurrencyChange: (currency: string) => void;
}

const POPULAR_CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "MAD", "AED", "SAR", "THB",
  "TND", "DZD", "XOF", "KES", "ZAR", "NGN", "EGP",
  "INR", "JPY", "CNY", "BRL", "MXN", "CAD", "AUD",
  "SGD", "MYR", "IDR", "PHP", "TRY", "PLN", "CZK", "SEK",
];

const fmtPrice = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
};

const CurrencyWalletWidget = ({ orders, preferredCurrency, onPreferredCurrencyChange }: Props) => {
  const paidOrders = useMemo(
    () => orders.filter(o => o.payment_status === "paid" && o.status !== "cancelled"),
    [orders]
  );

  // Group by currency
  const wallets: CurrencyBalance[] = useMemo(() => {
    const map = new Map<string, CurrencyBalance>();
    for (const o of paidOrders) {
      const cur = (o.currency || "EUR").toUpperCase();
      const existing = map.get(cur) || { currency: cur, amount: 0, orderCount: 0 };
      existing.amount += Number(o.total_price || 0);
      existing.orderCount += 1;
      map.set(cur, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [paidOrders]);

  // Convert all to preferred currency
  const totalConverted = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const rate = computeExchangeRate(w.currency, preferredCurrency);
      return sum + w.amount * rate;
    }, 0);
  }, [wallets, preferredCurrency]);

  // Get unique currencies from orders for the selector
  const availableCurrencies = useMemo(() => {
    const fromOrders = new Set(orders.map(o => (o.currency || "EUR").toUpperCase()));
    const all = new Set([...POPULAR_CURRENCIES, ...fromOrders]);
    return Array.from(all).sort();
  }, [orders]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" /> Multi-Currency Wallet
          </CardTitle>
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <Select value={preferredCurrency} onValueChange={onPreferredCurrencyChange}>
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total in preferred currency */}
        <div className="bg-accent/5 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue ({preferredCurrency})</p>
          <p className="text-2xl font-bold text-accent">{fmtPrice(totalConverted, preferredCurrency)}</p>
          {wallets.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Converted from {wallets.length} currencies
            </p>
          )}
        </div>

        <Separator />

        {/* Individual currency wallets */}
        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No paid orders yet</p>
        ) : (
          <div className="space-y-2">
            {wallets.map(w => {
              const convertedAmount = computeExchangeRate(w.currency, preferredCurrency) * w.amount;
              return (
                <div key={w.currency} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{w.currency}</Badge>
                    <span className="text-xs text-muted-foreground">{w.orderCount} order{w.orderCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{fmtPrice(w.amount, w.currency)}</p>
                    {w.currency !== preferredCurrency && (
                      <p className="text-[10px] text-muted-foreground">≈ {fmtPrice(convertedAmount, preferredCurrency)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrencyWalletWidget;
