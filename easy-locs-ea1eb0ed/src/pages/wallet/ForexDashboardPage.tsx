/**
 * ForexDashboardPage — Live exchange rates, quick converter & favorites.
 * Data: fx-rates edge function (ECB + Fixer, spread included) with Frankfurter fallback.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Star, ArrowRightLeft, TrendingUp,
  Loader2, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  useForexRates,
  useForexFavorites,
  MAJOR_PAIRS,
} from "@/hooks/useForexRates";
import OrbitCurrencySelector from "@/components/orbit/payments/OrbitCurrencySelector";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(225 22% 16%)";
const GOLD = "hsl(var(--accent))";
const CARD_BG = "hsl(220 35% 13%)";
const SURFACE = "hsl(220 30% 16%)";
const TEXT_MUTED = "hsl(220 20% 55%)";
const TEXT_PRIMARY = "hsl(220 10% 92%)";

function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 10) return rate.toFixed(3);
  return rate.toFixed(4);
}

// ── Pair Card ─────────────────────────────────────────────────────────────────

interface PairCardProps {
  base: string;
  target: string;
  rate: number | null;
  isFav: boolean;
  onFavToggle: () => void;
  onClick: () => void;
}

function PairCard({ base, target, rate, isFav, onFavToggle, onClick }: PairCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: SURFACE,
        border: `1px solid ${isFav ? `${GOLD}55` : "hsl(220 30% 22%)"}`,
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        position: "relative",
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onFavToggle(); }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 4,
          color: isFav ? GOLD : TEXT_MUTED,
        }}
        aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Star size={14} fill={isFav ? GOLD : "none"} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.04em" }}>
          {base}
        </span>
        <ArrowRightLeft size={10} style={{ color: TEXT_MUTED }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.04em" }}>
          {target}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, fontVariantNumeric: "tabular-nums" }}>
        {rate !== null ? formatRate(rate) : "—"}
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
        1 {base} = {rate !== null ? `${formatRate(rate)} ${target}` : "N/A"}
      </div>
    </motion.div>
  );
}

// ── Currency Selector Trigger ──────────────────────────────────────────────────

interface CurrencyTriggerProps {
  value: string;
  label: string;
  onClick: () => void;
}

function CurrencyTrigger({ value, label, onClick }: CurrencyTriggerProps) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <button
        onClick={onClick}
        style={{
          width: "100%",
          background: SURFACE,
          border: `1px solid hsl(225 20% 22%)`,
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          color: TEXT_PRIMARY,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {value}
        <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 6, fontWeight: 400 }}>▾</span>
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type SelectorMode = "from" | "to" | null;

export default function ForexDashboardPage() {
  useUiEngine("wallet-forexdashboardpage");
  const navigate = useNavigate();
  const { snapshot, loading, error, refresh, getRate } = useForexRates();
  const { isFavorite, toggleFavorite } = useForexFavorites();

  const [converterFrom, setConverterFrom] = useState("USD");
  const [converterTo, setConverterTo] = useState("EUR");
  const [amount, setAmount] = useState("1");
  const [activeSection, setActiveSection] = useState<"rates" | "converter">("rates");
  const [selectorMode, setSelectorMode] = useState<SelectorMode>(null);

  const spread = snapshot?.spread ?? 0;

  const converterResult = useMemo(() => {
    const num = parseFloat(amount);
    if (!isFinite(num) || num <= 0) return null;
    const rate = getRate(converterFrom, converterTo);
    if (rate === null) return null;
    const grossAmount = num * rate;
    const spreadAmount = grossAmount * spread;
    const netAmount = grossAmount - spreadAmount;
    return { grossAmount, netAmount, spreadAmount, rate, spread };
  }, [amount, converterFrom, converterTo, snapshot, spread]);

  const handleSwap = useCallback(() => {
    setConverterFrom(converterTo);
    setConverterTo(converterFrom);
  }, [converterFrom, converterTo]);

  const handleRefresh = useCallback(async () => {
    await refresh();
    toast.success("Taux actualisés");
  }, [refresh]);

  const handlePairClick = useCallback((base: string, target: string) => {
    setConverterFrom(base);
    setConverterTo(target);
    setAmount("1");
    setActiveSection("converter");
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: NAVY,
        paddingBottom: 100,
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${NAVY}f2`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid hsl(220 30% 22%)`,
          padding: "14px 16px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 540, margin: "0 auto" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 4 }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={16} style={{ color: GOLD }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY }}>
                Forex · Taux de change
              </span>
            </div>
            {snapshot && (
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>
                {snapshot.source.toUpperCase()} · {snapshot.fetchedAt.slice(0, 10)}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: loading ? TEXT_MUTED : GOLD, padding: 6 }}
            aria-label="Actualiser les taux"
          >
            <RefreshCw
              size={16}
              style={loading ? { animation: "spin 1s linear infinite" } : undefined}
            />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            gap: 4,
            maxWidth: 540,
            margin: "12px auto 0",
            background: CARD_BG,
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(["rates", "converter"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: activeSection === tab ? GOLD : "transparent",
                color: activeSection === tab ? NAVY : TEXT_MUTED,
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.18s",
              }}
            >
              {tab === "rates" ? "Taux en direct" : "Convertisseur"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 16px 0" }}>
        {/* Loading state */}
        {loading && !snapshot && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120, gap: 10, color: TEXT_MUTED }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: GOLD }} />
            <span style={{ fontSize: 13 }}>Chargement des taux...</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{ background: "hsl(0 50% 15%)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "hsl(0 80% 70%)" }}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeSection === "rates" && (
            <motion.div
              key="rates"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                {MAJOR_PAIRS.map((pair) => {
                  const pairKey = `${pair.base}/${pair.target}`;
                  const rate = getRate(pair.base, pair.target);
                  return (
                    <PairCard
                      key={pairKey}
                      base={pair.base}
                      target={pair.target}
                      rate={rate}
                      isFav={isFavorite(pairKey)}
                      onFavToggle={() => toggleFavorite(pairKey)}
                      onClick={() => handlePairClick(pair.base, pair.target)}
                    />
                  );
                })}
              </div>
              <div style={{ marginTop: 16, color: TEXT_MUTED, fontSize: 11, textAlign: "center" }}>
                Source: Banque Centrale Européenne via fx-rates
              </div>
            </motion.div>
          )}

          {activeSection === "converter" && (
            <motion.div
              key="converter"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{
                  background: CARD_BG,
                  border: `1px solid hsl(220 30% 22%)`,
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 4,
                }}
              >
                {/* Amount input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                    Montant
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    style={{
                      width: "100%",
                      background: SURFACE,
                      border: `1px solid hsl(225 20% 22%)`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: TEXT_PRIMARY,
                      fontSize: 20,
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    placeholder="1.00"
                  />
                </div>

                {/* Currency selectors */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <CurrencyTrigger
                    value={converterFrom}
                    label="De"
                    onClick={() => setSelectorMode("from")}
                  />
                  <button
                    onClick={handleSwap}
                    style={{
                      background: `${GOLD}22`,
                      border: `1px solid ${GOLD}44`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      color: GOLD,
                      flexShrink: 0,
                    }}
                    aria-label="Inverser les devises"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                  <CurrencyTrigger
                    value={converterTo}
                    label="Vers"
                    onClick={() => setSelectorMode("to")}
                  />
                </div>

                {/* Result */}
                <div
                  style={{
                    marginTop: 20,
                    background: `${GOLD}12`,
                    border: `1px solid ${GOLD}33`,
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  {converterResult !== null ? (
                    <>
                      {/* Gross amount */}
                      <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, fontVariantNumeric: "tabular-nums" }}>
                        {converterResult.grossAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        {" "}
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{converterTo}</span>
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
                        Taux : 1 {converterFrom} = {formatRate(converterResult.rate)} {converterTo}
                      </div>

                      {/* Spread breakdown (only when applicable) */}
                      {spread > 0 && converterResult.spreadAmount > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: `1px solid ${GOLD}22`,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Info size={11} />
                              Spread plateforme ({(spread * 100).toFixed(0)} %)
                            </span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                              − {converterResult.spreadAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {converterTo}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEXT_PRIMARY, fontWeight: 700 }}>
                            <span>Montant net reçu</span>
                            <span style={{ color: GOLD, fontVariantNumeric: "tabular-nums" }}>
                              {converterResult.netAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {converterTo}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 14, color: TEXT_MUTED, textAlign: "center" }}>
                      {loading ? (
                        <span style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          Chargement...
                        </span>
                      ) : (
                        "Taux non disponible pour cette paire"
                      )}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 10, textAlign: "center", marginBottom: 0 }}>
                  Taux indicatifs BCe. Les taux de change appliqués peuvent varier.
                </p>
              </div>

              {/* Quick pair chips */}
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Paires rapides
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {MAJOR_PAIRS.map((pair) => {
                    const pairKey = `${pair.base}/${pair.target}`;
                    const active = converterFrom === pair.base && converterTo === pair.target;
                    return (
                      <button
                        key={pairKey}
                        onClick={() => { setConverterFrom(pair.base); setConverterTo(pair.target); setAmount("1"); }}
                        style={{
                          background: active ? `${GOLD}22` : SURFACE,
                          border: `1px solid ${active ? GOLD + "66" : "hsl(220 30% 22%)"}`,
                          borderRadius: 20,
                          padding: "6px 12px",
                          cursor: "pointer",
                          color: active ? GOLD : TEXT_PRIMARY,
                          fontSize: 12,
                          fontWeight: active ? 700 : 400,
                        }}
                      >
                        {pairKey}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Currency Selector overlay (OrbitCurrencySelector) */}
      <AnimatePresence>
        {selectorMode !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 200,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
            onClick={() => setSelectorMode(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{
                width: "100%",
                maxWidth: 540,
                background: "hsl(220 35% 10%)",
                borderRadius: "20px 20px 0 0",
                padding: "16px 0 env(safe-area-inset-bottom, 16px)",
                maxHeight: "80dvh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <OrbitCurrencySelector
                selected={selectorMode === "from" ? converterFrom : converterTo}
                onSelect={(code) => {
                  if (selectorMode === "from") setConverterFrom(code);
                  else setConverterTo(code);
                  setSelectorMode(null);
                }}
                onClose={() => setSelectorMode(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
