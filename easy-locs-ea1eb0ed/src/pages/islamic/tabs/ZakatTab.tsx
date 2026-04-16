import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Calculator, Info, AlertTriangle, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GOLD = "hsl(var(--accent))";
const ZAKAT_RATE = 0.025;
const GOLD_NISAB_GRAMS = 85;
const FALLBACK_GOLD_PRICE_EUR = 65;
const ZAKAT_FITR_AMOUNT = 7;

interface ZakatInputs {
  cash: number;
  bankBalance: number;
  goldValue: number;
  silverValue: number;
  investments: number;
  merchandise: number;
  debtsOwed: number;
  zakatFitrPersons: number;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCIES: CurrencyInfo[] = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "Dollar US" },
  { code: "GBP", symbol: "£", name: "Livre sterling" },
  { code: "CAD", symbol: "CA$", name: "Dollar canadien" },
  { code: "AED", symbol: "د.إ", name: "Dirham EAU" },
  { code: "SAR", symbol: "﷼", name: "Riyal saoudien" },
  { code: "MAD", symbol: "د.م.", name: "Dirham marocain" },
  { code: "TND", symbol: "د.ت", name: "Dinar tunisien" },
  { code: "DZD", symbol: "د.ج", name: "Dinar algérien" },
  { code: "EGP", symbol: "ج.م", name: "Livre égyptienne" },
  { code: "TRY", symbol: "₺", name: "Livre turque" },
  { code: "IDR", symbol: "Rp", name: "Roupie indonésienne" },
  { code: "MYR", symbol: "RM", name: "Ringgit malaisien" },
  { code: "PKR", symbol: "₨", name: "Roupie pakistanaise" },
  { code: "BDT", symbol: "৳", name: "Taka bangladais" },
  { code: "NGN", symbol: "₦", name: "Naira nigérian" },
  { code: "XOF", symbol: "CFA", name: "Franc CFA" },
  { code: "CHF", symbol: "CHF", name: "Franc suisse" },
  { code: "AUD", symbol: "A$", name: "Dollar australien" },
  { code: "INR", symbol: "₹", name: "Roupie indienne" },
];

interface NbpGoldResponse {
  data: string;
  cena: number;
}

interface FrankfurterResponse {
  rates: Record<string, number>;
}

const INITIAL: ZakatInputs = {
  cash: 0, bankBalance: 0, goldValue: 0, silverValue: 0,
  investments: 0, merchandise: 0, debtsOwed: 0, zakatFitrPersons: 1,
};

async function fetchGoldPriceEUR(): Promise<{ price: number; live: boolean; source: string }> {
  try {
    const [nbpRes, fxRes] = await Promise.all([
      fetch("https://api.nbp.pl/api/cenyzlota?format=json", { signal: AbortSignal.timeout(8000) }),
      fetch("https://api.frankfurter.dev/v1/latest?from=PLN&to=EUR", { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!nbpRes.ok || !fxRes.ok) throw new Error("API unavailable");
    const nbpJson: NbpGoldResponse[] = await nbpRes.json();
    const fxJson: FrankfurterResponse = await fxRes.json();
    const goldPLN = nbpJson[0]?.cena;
    const plnToEur = fxJson.rates?.EUR;
    if (!goldPLN || !plnToEur) throw new Error("Missing data");
    return { price: goldPLN * plnToEur, live: true, source: `NBP ${nbpJson[0].data}` };
  } catch {
    return { price: FALLBACK_GOLD_PRICE_EUR, live: false, source: "estimation" };
  }
}

async function fetchFxRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`, { signal: AbortSignal.timeout(8000) });
    const json: FrankfurterResponse = await res.json();
    return json.rates?.[to] ?? 1;
  } catch {
    return 1;
  }
}

export default function ZakatTab() {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<ZakatInputs>(INITIAL);
  const [goldPrice, setGoldPrice] = useState<number>(FALLBACK_GOLD_PRICE_EUR);
  const [goldPriceLive, setGoldPriceLive] = useState(false);
  const [goldPriceSource, setGoldPriceSource] = useState("...");
  const [showResult, setShowResult] = useState(false);
  const [currency, setCurrency] = useState<CurrencyInfo>(CURRENCIES[0]);
  const [fxRate, setFxRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);

  useEffect(() => {
    fetchGoldPriceEUR().then(({ price, live, source }) => {
      setGoldPrice(price);
      setGoldPriceLive(live);
      setGoldPriceSource(source);
    });
  }, []);

  useEffect(() => {
    if (currency.code === "EUR") { setFxRate(1); return; }
    setFxLoading(true);
    fetchFxRate("EUR", currency.code).then(rate => {
      setFxRate(rate);
      setFxLoading(false);
    });
  }, [currency.code]);

  const handleChange = useCallback((field: keyof ZakatInputs, value: string) => {
    const num = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [field]: num }));
  }, []);

  const goldPriceLocal = goldPrice * fxRate;
  const nisab = goldPriceLocal * GOLD_NISAB_GRAMS;
  const totalWealth = inputs.cash + inputs.bankBalance + inputs.goldValue + inputs.silverValue + inputs.investments + inputs.merchandise;
  const netWealth = totalWealth - inputs.debtsOwed;
  const zakatMal = netWealth >= nisab ? netWealth * ZAKAT_RATE : 0;
  const zakatFitr = inputs.zakatFitrPersons * ZAKAT_FITR_AMOUNT * fxRate;
  const totalZakat = zakatMal + zakatFitr;

  const fmt = (n: number) => `${n.toFixed(2)} ${currency.symbol}`;

  const fields: { key: keyof ZakatInputs; labelKey: string; emoji: string; hintKey?: string }[] = [
    { key: "cash", labelKey: "islamic.zakat.cash", emoji: "💵", hintKey: "islamic.zakat.cash_hint" },
    { key: "bankBalance", labelKey: "islamic.zakat.bank", emoji: "🏦", hintKey: "islamic.zakat.bank_hint" },
    { key: "goldValue", labelKey: "islamic.zakat.gold_value", emoji: "🥇", hintKey: "islamic.zakat.gold_hint" },
    { key: "silverValue", labelKey: "islamic.zakat.silver_value", emoji: "🥈", hintKey: "islamic.zakat.silver_hint" },
    { key: "investments", labelKey: "islamic.zakat.investments", emoji: "📈", hintKey: "islamic.zakat.investments_hint" },
    { key: "merchandise", labelKey: "islamic.zakat.merchandise", emoji: "📦", hintKey: "islamic.zakat.merchandise_hint" },
    { key: "debtsOwed", labelKey: "islamic.zakat.debts_owed", emoji: "📝", hintKey: "islamic.zakat.debts_hint" },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: GOLD }}>{t("islamic.zakat.title")}</h2>
        <p className="text-xs text-muted-foreground">Zakat al-Mal & Zakat al-Fitr</p>
      </div>

      <div>
        <label className="text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("islamic.zakat.currency")}</label>
        <select
          value={currency.code}
          onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value) ?? CURRENCIES[0])}
          className="w-full text-xs rounded-lg border border-border bg-card px-2 py-2"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
          ))}
        </select>
        {fxLoading && <p className="text-[0.5625rem] text-muted-foreground mt-1">{t("islamic.loading")}...</p>}
        {!fxLoading && currency.code !== "EUR" && fxRate !== 1 && (
          <p className="text-[0.5625rem] text-muted-foreground mt-1">1 EUR = {fxRate.toFixed(4)} {currency.code}</p>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}>
        <div className="flex items-start gap-2">
          <Info size={14} style={{ color: GOLD }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold" style={{ color: GOLD }}>{t("islamic.zakat.nisab_threshold")}</p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {GOLD_NISAB_GRAMS}g @ ~{goldPriceLocal.toFixed(0)} {currency.symbol}/g = <strong>{nisab.toFixed(0)} {currency.symbol}</strong>
            </p>
            <p className="text-[0.5625rem] text-muted-foreground mt-0.5">
              {goldPriceLive
                ? `${t("islamic.zakat.live_price")} (${goldPriceSource})`
                : t("islamic.zakat.estimated_price")}
            </p>
          </div>
        </div>
      </div>

      {!goldPriceLive && (
        <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "hsl(var(--destructive)/0.08)", border: "1px solid hsl(var(--destructive)/0.2)" }}>
          <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-[0.6875rem] text-destructive/80">
            {t("islamic.zakat.price_warning")}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[0.75rem] font-bold uppercase tracking-wide" style={{ color: `${GOLD}bb` }}>
          Zakat al-Mal (2,5%)
        </h3>
        {fields.map(f => (
          <div key={f.key}>
            <label className="flex items-center gap-2 text-xs font-semibold mb-1">
              <span>{f.emoji}</span> {t(f.labelKey)}
            </label>
            {f.hintKey && <p className="text-[0.625rem] text-muted-foreground mb-1">{t(f.hintKey)}</p>}
            <div className="relative">
              <input
                type="number"
                min="0"
                value={inputs[f.key] || ""}
                onChange={e => handleChange(f.key, e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm tabular-nums pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currency.symbol}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-[0.75rem] font-bold uppercase tracking-wide" style={{ color: `${GOLD}bb` }}>
          Zakat al-Fitr
        </h3>
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold mb-1">
            <span>👨‍👩‍👧‍👦</span> {t("islamic.zakat.persons")}
          </label>
          <p className="text-[0.625rem] text-muted-foreground mb-1">
            ~{(ZAKAT_FITR_AMOUNT * fxRate).toFixed(2)} {currency.symbol} {t("islamic.zakat.per_person")}
          </p>
          <input
            type="number"
            min="1"
            value={inputs.zakatFitrPersons || ""}
            onChange={e => handleChange("zakatFitrPersons", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm tabular-nums"
          />
        </div>
      </div>

      <button
        onClick={() => setShowResult(true)}
        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        style={{ background: GOLD, color: "hsl(226 22% 14%)" }}
      >
        <Calculator size={16} />
        {t("islamic.zakat.calculate")}
      </button>

      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 space-y-4"
          style={{
            background: `linear-gradient(135deg, hsl(226 22% 14%) 0%, hsl(226 22% 18%) 100%)`,
            border: `1px solid ${GOLD}44`,
          }}
        >
          <h3 className="text-center text-[0.6875rem] uppercase tracking-widest" style={{ color: `${GOLD}99` }}>
            {t("islamic.zakat.result")}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("islamic.zakat.total_wealth")}</span>
              <span className="font-semibold tabular-nums text-white">{fmt(totalWealth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">- {t("islamic.zakat.debts")}</span>
              <span className="font-semibold tabular-nums text-white">- {fmt(inputs.debtsOwed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">= {t("islamic.zakat.net_wealth")}</span>
              <span className="font-semibold tabular-nums text-white">{fmt(netWealth)}</span>
            </div>
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nisab ({GOLD_NISAB_GRAMS}g)</span>
                <span className="font-semibold tabular-nums text-white">{fmt(nisab)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">{t("islamic.zakat.eligible")}</span>
                <span className="font-bold" style={{ color: netWealth >= nisab ? "#4ade80" : "#ef4444" }}>
                  {netWealth >= nisab ? t("islamic.zakat.yes") : t("islamic.zakat.no")}
                </span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zakat al-Mal (2,5%)</span>
                <span className="font-bold tabular-nums" style={{ color: GOLD }}>{fmt(zakatMal)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Zakat al-Fitr ({inputs.zakatFitrPersons} pers.)</span>
                <span className="font-bold tabular-nums" style={{ color: GOLD }}>{fmt(zakatFitr)}</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-white/10">
            <p className="text-[0.625rem] uppercase tracking-widest mb-1" style={{ color: `${GOLD}99` }}>{t("islamic.zakat.total_due")}</p>
            <p className="text-3xl font-extrabold tabular-nums" style={{ color: GOLD }}>
              {fmt(totalZakat)}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
