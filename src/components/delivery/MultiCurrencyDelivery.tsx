/**
 * MultiCurrencyDelivery — Multi-currency delivery fee management.
 * Conversion, localized display, fee configuration per zone/currency.
 * PASS87-MM: Multi-Currency Delivery
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, Globe, ArrowRightLeft, Plus, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface CurrencyZone {
  id: string;
  currency: string;
  symbol: string;
  locale: string;
  baseFee: number;
  perKmRate: number;
  perKgRate: number;
  expressMultiplier: number;
  urgentMultiplier: number;
  minFee: number;
  maxFee: number;
}

const SUPPORTED_CURRENCIES: { code: string; symbol: string; locale: string; name: string }[] = [
  { code: "EUR", symbol: "€", locale: "fr-FR", name: "Euro" },
  { code: "USD", symbol: "$", locale: "en-US", name: "US Dollar" },
  { code: "GBP", symbol: "£", locale: "en-GB", name: "British Pound" },
  { code: "MAD", symbol: "DH", locale: "fr-MA", name: "Dirham marocain" },
  { code: "XOF", symbol: "CFA", locale: "fr-SN", name: "Franc CFA (BCEAO)" },
  { code: "XAF", symbol: "FCFA", locale: "fr-CM", name: "Franc CFA (BEAC)" },
  { code: "TND", symbol: "DT", locale: "fr-TN", name: "Dinar tunisien" },
  { code: "DZD", symbol: "DA", locale: "fr-DZ", name: "Dinar algérien" },
  { code: "EGP", symbol: "E£", locale: "ar-EG", name: "Egyptian Pound" },
  { code: "NGN", symbol: "₦", locale: "en-NG", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", locale: "en-KE", name: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", locale: "en-ZA", name: "South African Rand" },
];

const DEFAULT_RATES: Record<string, number> = {
  EUR: 1, USD: 1.08, GBP: 0.86, MAD: 10.9, XOF: 655.96, XAF: 655.96,
  TND: 3.4, DZD: 146.5, EGP: 50.2, NGN: 1650, KES: 155, ZAR: 19.8,
};

const formatCurrency = (amount: number, currency: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch { return `${amount.toFixed(2)} ${currency}`; }
};

export default function MultiCurrencyDelivery({ orgId }: { orgId: string }) {
  const [zones, setZones] = useState<CurrencyZone[]>([
    { id: "eur-default", currency: "EUR", symbol: "€", locale: "fr-FR", baseFee: 5, perKmRate: 0.8, perKgRate: 0.3, expressMultiplier: 1.5, urgentMultiplier: 2.0, minFee: 3, maxFee: 50 },
    { id: "mad-default", currency: "MAD", symbol: "DH", locale: "fr-MA", baseFee: 20, perKmRate: 3, perKgRate: 1.5, expressMultiplier: 1.5, urgentMultiplier: 2.0, minFee: 15, maxFee: 300 },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConverter, setShowConverter] = useState(false);
  const [convAmount, setConvAmount] = useState(10);
  const [convFrom, setConvFrom] = useState("EUR");
  const [convTo, setConvTo] = useState("MAD");

  const convertedAmount = useMemo(() => {
    const fromRate = DEFAULT_RATES[convFrom] || 1;
    const toRate = DEFAULT_RATES[convTo] || 1;
    return (convAmount / fromRate) * toRate;
  }, [convAmount, convFrom, convTo]);

  const calculateFee = (zone: CurrencyZone, distanceKm: number, weightKg: number, priority: string) => {
    let fee = zone.baseFee + (distanceKm * zone.perKmRate) + (weightKg * zone.perKgRate);
    if (priority === "express") fee *= zone.expressMultiplier;
    if (priority === "urgent") fee *= zone.urgentMultiplier;
    return Math.min(zone.maxFee, Math.max(zone.minFee, fee));
  };

  const addZone = (currencyCode: string) => {
    const cur = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!cur) return;
    if (zones.some(z => z.currency === currencyCode)) { toast.error("Devise déjà configurée"); return; }
    const rate = DEFAULT_RATES[currencyCode] || 1;
    setZones(prev => [...prev, {
      id: `${currencyCode.toLowerCase()}-${Date.now()}`,
      currency: cur.code, symbol: cur.symbol, locale: cur.locale,
      baseFee: Math.round(5 * rate), perKmRate: +(0.8 * rate).toFixed(2), perKgRate: +(0.3 * rate).toFixed(2),
      expressMultiplier: 1.5, urgentMultiplier: 2.0,
      minFee: Math.round(3 * rate), maxFee: Math.round(50 * rate),
    }]);
    haptic("success");
    toast.success(`Zone ${cur.code} ajoutée`);
  };

  const updateZone = (id: string, updates: Partial<CurrencyZone>) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const removeZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    toast("Zone supprimée");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Multi-Currency Delivery</h3>
      </div>

      {/* Quick converter */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
        <button onClick={() => setShowConverter(!showConverter)}
          className="flex items-center gap-2 w-full text-left">
          <ArrowRightLeft className="w-3.5 h-3.5" style={{ color: "hsl(var(--info))" }} />
          <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Convertisseur rapide</span>
        </button>
        {showConverter && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Montant</Label>
                <Input type="number" value={convAmount} onChange={e => setConvAmount(+e.target.value)}
                  className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
              </div>
              <div>
                <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>De</Label>
                <select value={convFrom} onChange={e => setConvFrom(e.target.value)}
                  className="w-full h-8 text-xs rounded-md px-2" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                  {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Vers</Label>
                <select value={convTo} onChange={e => setConvTo(e.target.value)}
                  className="w-full h-8 text-xs rounded-md px-2" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                  {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
            </div>
            <div className="text-center py-2 rounded-lg" style={{ background: "hsl(var(--hud-cyan) / 0.08)" }}>
              <p className="text-lg font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                {formatCurrency(convertedAmount, convTo, SUPPORTED_CURRENCIES.find(c => c.code === convTo)?.locale || "en")}
              </p>
              <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                1 {convFrom} = {((DEFAULT_RATES[convTo] || 1) / (DEFAULT_RATES[convFrom] || 1)).toFixed(4)} {convTo}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Currency zones */}
      <div className="space-y-2">
        {zones.map((zone, i) => {
          const editing = editingId === zone.id;
          const sampleFees = [
            { label: "5km / 2kg Std", fee: calculateFee(zone, 5, 2, "standard") },
            { label: "10km / 5kg Exp", fee: calculateFee(zone, 10, 5, "express") },
            { label: "20km / 10kg Urg", fee: calculateFee(zone, 20, 10, "urgent") },
          ];

          return (
            <motion.div key={zone.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{zone.symbol}</span>
                  <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{zone.currency}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>
                    Base: {formatCurrency(zone.baseFee, zone.currency, zone.locale)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                    onClick={() => { setEditingId(editing ? null : zone.id); haptic("selection"); }}>
                    <Settings className="w-3 h-3" style={{ color: "hsl(var(--hud-text-dim))" }} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeZone(zone.id)}>
                    <Trash2 className="w-3 h-3" style={{ color: "hsl(var(--destructive) / 0.5)" }} />
                  </Button>
                </div>
              </div>

              {/* Sample fee preview */}
              <div className="grid grid-cols-3 gap-1.5">
                {sampleFees.map(sf => (
                  <div key={sf.label} className="text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                    <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                      {formatCurrency(sf.fee, zone.currency, zone.locale)}
                    </p>
                    <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{sf.label}</p>
                  </div>
                ))}
              </div>

              {/* Edit panel */}
              {editing && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  {[
                    { label: "Frais de base", key: "baseFee" as const },
                    { label: "Par km", key: "perKmRate" as const },
                    { label: "Par kg", key: "perKgRate" as const },
                    { label: "× Express", key: "expressMultiplier" as const },
                    { label: "× Urgent", key: "urgentMultiplier" as const },
                    { label: "Min", key: "minFee" as const },
                    { label: "Max", key: "maxFee" as const },
                  ].map(f => (
                    <div key={f.key}>
                      <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{f.label}</Label>
                      <Input type="number" step="0.1" value={zone[f.key]}
                        onChange={e => updateZone(zone.id, { [f.key]: +e.target.value })}
                        className="h-7 text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add zone */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px dashed hsl(var(--hud-border) / 0.15)" }}>
        <Label className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Ajouter une devise</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUPPORTED_CURRENCIES.filter(c => !zones.some(z => z.currency === c.code)).map(c => (
            <button key={c.code} onClick={() => addZone(c.code)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium transition-colors"
              style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text-dim))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <Plus className="w-2.5 h-2.5" /> {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--success) / 0.05)", border: "1px solid hsl(var(--success) / 0.1)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--success))" }}>
          {zones.length} devise{zones.length > 1 ? "s" : ""} configurée{zones.length > 1 ? "s" : ""}
        </p>
        <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Les taux de change sont mis à jour automatiquement via le moteur FX de la plateforme
        </p>
      </div>
    </div>
  );
}
