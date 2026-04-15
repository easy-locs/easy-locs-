import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Star, ArrowRightLeft, TrendingUp,
  Loader2, Info, AlertTriangle,
} from "lucide-react";
import {
  useForexRates,
  useForexFavorites,
  MAJOR_PAIRS,
} from "@/hooks/useForexRates";
import OrbitCurrencySelector from "@/components/orbit/payments/OrbitCurrencySelector";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const NAVY = "hsl(226 24% 14%)";
const GOLD = "hsl(var(--accent))";
const CARD_BG = "hsl(226 24% 11%)";
const SURFACE = "hsl(226 24% 12%)";
const TEXT_MUTED = "hsl(0 0% 100% / 0.4)";
const TEXT_PRIMARY = "hsl(0 0% 100% / 0.85)";

function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 10) return rate.toFixed(3);
  return rate.toFixed(4);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    + " à "
    + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function sourceLabel(source: string): string {
  if (source.startsWith("ecb")) return "ECB";
  if (source.startsWith("frankfurter")) return "Frankfurter (ECB)";
  if (source.startsWith("exchangerate")) return "ExchangeRate-API";
  if (source === "fixer") return "Fixer";
  if (source === "static") return "Static";
  if (source.includes("engine")) return "Cache";
  return source.toUpperCase();
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: SURFACE,
        border: "1px solid hsl(226 22% 16%)",
        borderRadius: 14,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 30, height: 10, borderRadius: 4, background: "hsl(226 22% 20%)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: 10, height: 10, borderRadius: 4, background: "hsl(226 22% 20%)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: 30, height: 10, borderRadius: 4, background: "hsl(226 22% 20%)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
      <div style={{ width: 80, height: 22, borderRadius: 6, background: "hsl(226 22% 20%)", animation: "pulse 1.5s ease-in-out infinite", marginBottom: 6 }} />
      <div style={{ width: 100, height: 10, borderRadius: 4, background: "hsl(226 22% 18%)", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );
}


interface PairCardProps {
  base: string;
  target: string;
  rate: number | null;
  isFav: boolean;
  onFavToggle: () => void;
  onClick: () => void;
  removeFavLabel: string;
  addFavLabel: string;
  fetchedAt?: string | null;
  source?: string;
  isStatic?: boolean;
}

function PairCard({ base, target, rate, isFav, onFavToggle, onClick, removeFavLabel, addFavLabel, fetchedAt, source, isStatic }: PairCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: SURFACE,
        border: `1px solid ${isFav ? `${GOLD}55` : "hsl(226 22% 16%)"}`,
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
        aria-label={isFav ? removeFavLabel : addFavLabel}
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
      {rate !== null ? (
        <>
          <div style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, fontVariantNumeric: "tabular-nums" }}>
            {formatRate(rate)}
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
            1 {base} = {formatRate(rate)} {target}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <div style={{ width: 60, height: 18, borderRadius: 4, background: "hsl(226 22% 20%)", animation: "pulse 1.5s ease-in-out infinite", margin: "0 auto" }} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        {source && (
          <span style={{ fontSize: 8, color: TEXT_MUTED, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {sourceLabel(source)}
          </span>
        )}
        {fetchedAt && (
          <span style={{ fontSize: 8, color: TEXT_MUTED, opacity: 0.6 }}>
            {formatDateTime(fetchedAt)}
          </span>
        )}
      </div>
      {isStatic && (
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          marginTop: 4, padding: "2px 6px", borderRadius: 6,
          background: "hsl(45 80% 50% / 0.1)", border: "1px solid hsl(45 80% 50% / 0.2)",
          width: "fit-content",
        }}>
          <AlertTriangle size={8} style={{ color: "hsl(45 80% 50%)" }} />
          <span style={{ fontSize: 8, color: "hsl(45 80% 50%)", fontWeight: 600 }}>Indicatif</span>
        </div>
      )}
    </motion.div>
  );
}

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
          border: `1px solid hsl(226 22% 22%)`,
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

type SelectorMode = "from" | "to" | null;

export default function ForexDashboardPage() {
  useUiEngine("wallet-forexdashboardpage");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { snapshot, loading, error, refresh, getRate } = useForexRates();
  const { isFavorite, toggleFavorite } = useForexFavorites();

  const [converterFrom, setConverterFrom] = useState("USD");
  const [converterTo, setConverterTo] = useState("EUR");
  const [amount, setAmount] = useState("1");
  const [activeSection, setActiveSection] = useState<"rates" | "converter">("rates");
  const [selectorMode, setSelectorMode] = useState<SelectorMode>(null);

  const spread = snapshot?.spread ?? 0;
  const isStatic = snapshot?.source === "static";

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

  const [justRefreshed, setJustRefreshed] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFetchedAtRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    if (prevFetchedAtRef.current !== null && prevFetchedAtRef.current !== snapshot.fetchedAt) {
      setJustRefreshed(true);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => setJustRefreshed(false), 2000);
    }
    prevFetchedAtRef.current = snapshot.fetchedAt;
  }, [snapshot?.fetchedAt]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handlePairClick = useCallback((base: string, target: string) => {
    setConverterFrom(base);
    setConverterTo(target);
    setAmount("1");
    setActiveSection("converter");
  }, []);

  return (
    <SubPageShell
      noContentPad
      style={{ background: NAVY, paddingBottom: 100, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${NAVY}f2`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid hsl(226 22% 16%)`,
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
                {t("forex.title") || "Forex · Exchange Rates"}
              </span>
            </div>
            {snapshot && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <motion.span
                  key={snapshot.fetchedAt}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ fontSize: 10, color: TEXT_MUTED }}
                >
                  {sourceLabel(snapshot.source)} · {formatDateTime(snapshot.fetchedAt)}
                </motion.span>
                <AnimatePresence>
                  {justRefreshed && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 9,
                        fontWeight: 600,
                        color: "hsl(145 60% 50%)",
                        background: "hsl(145 60% 50% / 0.12)",
                        borderRadius: 20,
                        padding: "1px 6px",
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "hsl(145 60% 50%)",
                        display: "inline-block",
                      }} />
                      Live
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: loading ? TEXT_MUTED : GOLD,
              padding: 6,
              position: "relative",
            }}
            aria-label={t("forex.refresh_rates") || "Refresh rates"}
          >
            <motion.span
              animate={
                loading
                  ? { rotate: 360 }
                  : justRefreshed
                    ? { rotate: [0, 360], scale: [1, 1.15, 1] }
                    : { rotate: 0, scale: 1 }
              }
              transition={
                loading
                  ? { rotate: { duration: 1, repeat: Infinity, ease: "linear" } }
                  : justRefreshed
                    ? { duration: 0.6, ease: "easeOut" }
                    : { duration: 0.2 }
              }
              style={{ display: "inline-flex", color: "inherit" }}
            >
              <RefreshCw size={16} />
            </motion.span>
            <AnimatePresence>
              {justRefreshed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </AnimatePresence>
          </button>
        </div>

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
              {tab === "rates" ? (t("forex.live_rates") || "Live Rates") : (t("forex.converter") || "Converter")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 16px 0" }}>
        {loading && !snapshot && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {isStatic && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "hsl(45 80% 50% / 0.08)", border: "1px solid hsl(45 80% 50% / 0.2)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12,
            color: "hsl(45 80% 60%)",
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{t("forex.indicative_badge") || "Taux indicatifs — connexion aux sources live indisponible"}</span>
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
              {snapshot && (
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
                        removeFavLabel={t("forex.remove_fav") || "Remove from favorites"}
                        addFavLabel={t("forex.add_fav") || "Add to favorites"}
                        fetchedAt={snapshot.fetchedAt}
                        source={snapshot.source}
                        isStatic={isStatic}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 16, color: TEXT_MUTED, fontSize: 11, textAlign: "center" }}>
                {snapshot ? `Source : ${sourceLabel(snapshot.source)}` : (t("forex.source_ecb") || "Source: European Central Bank via fx-rates")}
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
                  border: `1px solid hsl(226 22% 16%)`,
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 4,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                    {t("forex.amount") || "Amount"}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    style={{
                      width: "100%",
                      background: SURFACE,
                      border: `1px solid hsl(226 22% 22%)`,
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

                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <CurrencyTrigger
                    value={converterFrom}
                    label={t("forex.from") || "From"}
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
                    aria-label={t("forex.swap_currencies") || "Swap currencies"}
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                  <CurrencyTrigger
                    value={converterTo}
                    label={t("forex.to") || "To"}
                    onClick={() => setSelectorMode("to")}
                  />
                </div>

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
                      <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, fontVariantNumeric: "tabular-nums" }}>
                        {converterResult.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        {" "}
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{converterTo}</span>
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
                        {t("forex.rate_label") || "Rate"}: 1 {converterFrom} = {formatRate(converterResult.rate)} {converterTo}
                      </div>

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
                              {t("forex.platform_spread") || "Platform spread"} ({(spread * 100).toFixed(0)} %)
                            </span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                              − {converterResult.spreadAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {converterTo}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEXT_PRIMARY, fontWeight: 700 }}>
                            <span>{t("forex.net_received") || "Net amount received"}</span>
                            <span style={{ color: GOLD, fontVariantNumeric: "tabular-nums" }}>
                              {converterResult.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {converterTo}
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
                          {t("common.loading") || "Loading..."}
                        </span>
                      ) : (
                        t("forex.rate_unavailable") || "Rate not available for this pair"
                      )}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 10, textAlign: "center", marginBottom: 0 }}>
                  {isStatic
                    ? (t("forex.static_disclaimer") || "Taux indicatifs statiques. Les taux réels peuvent varier.")
                    : (t("forex.indicative_disclaimer") || "Indicative ECB rates. Applied exchange rates may vary.")}
                </p>
              </div>

              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  {t("forex.quick_pairs") || "Quick Pairs"}
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
                          border: `1px solid ${active ? GOLD + "66" : "hsl(226 22% 16%)"}`,
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
                background: "hsl(226 24% 10%)",
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
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </SubPageShell>
  );
}
