/**
 * OrbitSmartHub — Premium command center with interactive orbit menu.
 * Enhanced glassmorphism, smoother transitions, better label legibility.
 */
import { useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Phone, FolderOpen, Users,
  CreditCard, Handshake, Shield, UserCircle,
  Building, MapPin,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";

interface CountryStat {
  code: string; count: number; flag: string; name: string; tenants: number;
}

interface Props {
  totalProperties: number;
  totalCountries: number;
  propertiesByCountry: CountryStat[];
}

const ACTIONS = [
  { icon: MessageSquare, labelKey: "orbit.nav.chats", fallback: "Chats", path: "/dashboard/communication?section=chats" },
  { icon: Phone, labelKey: "orbit.nav.calls", fallback: "Calls", path: "/dashboard/communication?section=calls" },
  { icon: FolderOpen, labelKey: "orbit.nav.files", fallback: "Files", path: "/dashboard/communication?section=files" },
  { icon: Users, labelKey: "orbit.nav.contacts", fallback: "Contacts", path: "/dashboard/communication?section=contacts" },
  { icon: CreditCard, labelKey: "orbit.nav.wallet", fallback: "Pay", path: "/dashboard/communication?section=payments" },
  { icon: Handshake, labelKey: "orbit.nav.deals", fallback: "Deals", path: "/dashboard/communication?section=chats" },
  { icon: Shield, labelKey: "orbit.nav.security", fallback: "Security", path: "/dashboard/communication?section=settings" },
  { icon: UserCircle, labelKey: "orbit.nav.you", fallback: "You", path: "/dashboard/communication?section=you" },
] as const;

export default function OrbitSmartHub({ totalProperties, totalCountries, propertiesByCountry }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const R = 105;
  const SIZE = 340;
  const C = SIZE / 2;
  const BTN = 44;

  const handleAction = (idx: number) => {
    haptic("medium");
    setActiveIdx(idx);
    setTimeout(() => {
      navigate(ACTIONS[idx].path);
      setActiveIdx(null);
    }, 200);
  };

  return (
    <div
      className="rounded-2xl overflow-visible"
      style={{
        background: "hsl(var(--hud-bg))",
        border: "1px solid hsl(var(--hud-border) / 0.18)",
        boxShadow: "0 8px 40px hsl(var(--hud-bg) / 0.6), 0 0 0 1px hsl(var(--hud-cyan) / 0.04)",
      }}
    >
      <div className="p-4 sm:p-6">
        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>

          {/* Outer pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: R * 2 + 56, height: R * 2 + 56,
              top: C - R - 28, left: C - R - 28,
              border: "1px solid hsl(var(--hud-cyan) / 0.06)",
            }}
            animate={reduceMotion ? {} : { scale: [1, 1.02, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main orbit track */}
          <div
            className="absolute rounded-full"
            style={{
              width: R * 2, height: R * 2,
              top: C - R, left: C - R,
              border: "1px solid hsl(var(--hud-cyan) / 0.1)",
              background: "radial-gradient(circle, transparent 60%, hsl(var(--hud-cyan) / 0.02) 100%)",
            }}
          />

          {/* Scanning sweep — lighter, hidden on mobile for perf */}
          <motion.div
            className="absolute rounded-full hidden sm:block"
            style={{
              width: R * 2 - 6, height: R * 2 - 6,
              top: C - R + 3, left: C - R + 3,
              background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--hud-cyan) / 0.06) 10%, transparent 20%)",
            }}
            animate={reduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Action buttons */}
          {ACTIONS.map((action, i) => {
            const angle = (i * 360) / ACTIONS.length - 90;
            const rad = (angle * Math.PI) / 180;
            const x = C + R * Math.cos(rad) - BTN / 2;
            const y = C + R * Math.sin(rad) - BTN / 2;
            const isActive = activeIdx === i;

            return (
              <motion.button
                key={action.fallback}
                className="absolute flex flex-col items-center justify-center cursor-pointer z-10"
                style={{
                  width: BTN, height: BTN, top: y, left: x,
                  borderRadius: 14,
                  border: `1.5px solid hsl(var(--hud-cyan) / ${isActive ? 0.6 : 0.15})`,
                  background: isActive
                    ? "hsl(var(--hud-cyan) / 0.12)"
                    : "hsl(var(--hud-surface) / 0.9)",
                  boxShadow: isActive
                    ? "0 0 24px hsl(var(--hud-cyan) / 0.25)"
                    : "0 2px 8px hsl(var(--background) / 0.3)",
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 300, damping: 22 }}
                whileHover={{ scale: 1.15, boxShadow: "0 0 20px hsl(var(--hud-cyan) / 0.2)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAction(i)}
                title={t(action.labelKey) || action.fallback}
              >
                <action.icon
                  className="h-4 w-4"
                  style={{ color: isActive ? "hsl(var(--hud-text))" : "hsl(var(--hud-cyan))" }}
                />
              </motion.button>
            );
          })}

          {/* Labels */}
          {ACTIONS.map((action, i) => {
            const angle = (i * 360) / ACTIONS.length - 90;
            const rad = (angle * Math.PI) / 180;
            const labelR = R + 32;
            const lx = C + labelR * Math.cos(rad);
            const ly = C + labelR * Math.sin(rad);

            return (
              <motion.span
                key={`label-${action.fallback}`}
                className="absolute text-[10px] font-semibold tracking-wide pointer-events-none whitespace-nowrap"
                style={{
                  top: ly, left: lx,
                  transform: "translate(-50%, -50%)",
                  color: "hsl(var(--hud-text-dim))",
                  textShadow: "0 1px 3px hsl(var(--hud-bg) / 0.8)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                {t(action.labelKey) || action.fallback}
              </motion.span>
            );
          })}

          {/* Center core — enhanced glow */}
          <motion.div
            className="absolute flex flex-col items-center justify-center rounded-full z-20"
            style={{
              width: 110, height: 110, top: C - 55, left: C - 55,
              border: "1.5px solid hsl(var(--hud-cyan) / 0.2)",
              background: "radial-gradient(circle, hsl(var(--hud-cyan) / 0.08) 0%, hsl(var(--hud-bg)) 70%)",
              boxShadow: "0 0 50px hsl(var(--hud-cyan) / 0.1), inset 0 0 30px hsl(var(--hud-cyan) / 0.04)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "1px solid hsl(var(--hud-cyan) / 0.1)" }}
              animate={reduceMotion ? {} : { scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Building className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
              <span className="text-xl font-bold tabular-nums leading-none" style={{ color: "hsl(var(--hud-text))" }}>
                {totalProperties}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider leading-none" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {t("common.properties") || "Properties"}
            </span>
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--hud-cyan) / 0.6)" }} />
              <span className="text-sm font-bold tabular-nums leading-none" style={{ color: "hsl(var(--hud-text))" }}>
                {totalCountries}
              </span>
              <span className="text-[8px] leading-none" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {t("page.dashboard.countries_short") || "countries"}
              </span>
            </div>
          </motion.div>

          {/* Orbit dot particles — fewer, subtler */}
          {[0, 72, 144, 216, 288].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const px = C + R * Math.cos(rad) - 1.5;
            const py = C + R * Math.sin(rad) - 1.5;
            return (
              <motion.div
                key={`dot-${angle}`}
                className="absolute w-[3px] h-[3px] rounded-full"
                style={{ top: py, left: px, background: "hsl(var(--hud-cyan) / 0.3)" }}
                animate={reduceMotion ? {} : { opacity: [0.1, 0.6, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              />
            );
          })}
        </div>
      </div>

      {/* Country chips — enhanced */}
      {propertiesByCountry.length > 0 && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div
            className="flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth pb-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {propertiesByCountry.map((c, i) => (
              <motion.button
                key={c.code}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all text-xs cursor-pointer min-h-[44px] sm:min-h-0"
                style={{
                  background: "hsl(var(--hud-surface))",
                  border: "1px solid hsl(var(--hud-border) / 0.1)",
                  color: "hsl(var(--hud-text))",
                }}
                whileHover={{ borderColor: "hsl(var(--hud-cyan) / 0.35)", y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptic("light");
                  navigate(`/dashboard/country/${c.code.toLowerCase()}`);
                }}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="font-medium whitespace-nowrap">{c.name}</span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: "hsl(var(--hud-cyan))", minWidth: "1.2em", textAlign: "right" }}
                >
                  {c.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
