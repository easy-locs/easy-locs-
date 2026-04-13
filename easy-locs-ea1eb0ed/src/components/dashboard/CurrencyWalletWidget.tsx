import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppText } from "@/components/ui/AppText";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wallet, ArrowRightLeft, Globe } from "lucide-react";
import { computeExchangeRate } from "@/hooks/useCurrencyConversion";
import { projectCurrencyWallets } from "@/families/dashboard/dashboard.read-model";

interface Props {
  orders: Array<{ currency: string; total_price: number; payment_status: string; status: string }>;
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
  const model = useMemo(
    () => projectCurrencyWallets(orders, preferredCurrency, computeExchangeRate),
    [orders, preferredCurrency],
  );

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
        <div className="bg-accent/5 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue ({preferredCurrency})</p>
          <p className="text-2xl font-bold text-accent">{fmtPrice(model.totalConverted, preferredCurrency)}</p>
          {model.wallets.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Converted from {model.wallets.length} currencies
            </p>
          )}
        </div>

        <Separator />

        {model.wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No paid orders yet</p>
        ) : (
          <div className="space-y-2">
            {model.wallets.map(w => {
              const convertedAmount = computeExchangeRate(w.currency, preferredCurrency) * w.amount;
              return (
                <div key={w.currency} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{w.currency}</Badge>
                    <span className="text-xs text-muted-foreground">{w.orderCount} order{w.orderCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-right">
                    <AppText as="p" size="sm" lines={1} className="font-semibold">{fmtPrice(w.amount, w.currency)}</AppText>
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
