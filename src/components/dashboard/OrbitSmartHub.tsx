/**
 * OrbitSmartHub — Orbit command center with dynamic rotating menu.
 * Uses HUD cyan tokens for the dark premium aesthetic.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Phone,
  FolderOpen,
  Users,
  CreditCard,
  Handshake,
  Shield,
  UserCircle,
  Building,
  MapPin,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";

interface CountryStat {
  code: string;
  count: number;
  flag: string;
  name: string;
  tenants: number;
}

interface Props {
  totalProperties: number;
  totalCountries: number;
  propertiesByCountry: CountryStat[];
}

const ACTIONS = [
  { icon: MessageSquare, label: "Chats", path: "/dashboard/communication?section=chats", angle: -90 },
  { icon: Phone, label: "Calls", path: "/dashboard/communication?section=calls", angle: -45 },
  { icon: FolderOpen, label: "Files", path: "/dashboard/communication?section=files", angle: 0 },
  { icon: Users, label: "Contacts", path: "/dashboard/communication?section=contacts", angle: 45 },
  { icon: CreditCard, label: "Payments", path: "/dashboard/communication?section=payments", angle: 90 },
  { icon: Handshake, label: "Deals", path: "/dashboard/communication?section=chats", angle: 135 },
  { icon: Shield, label: "Security", path: "/dashboard/communication?section=settings", angle: 180 },
  { icon: UserCircle, label: "You", path: "/dashboard/communication?section=you", angle: 225 },
] as const;

export default function OrbitSmartHub({ totalProperties, totalCountries, propertiesByCountry }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const ORBIT_RADIUS = 108;
  const CENTER = 136;
  const ORBIT_SIZE = 272;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "hsl(var(--hud-bg))",
        border: "1px solid hsl(var(--hud-border) / 0.15)",
      }}
    >
      <div className="p-4 sm:p-6">
        <div className="relative mx-auto" style={{ width: ORBIT_SIZE, height: ORBIT_SIZE }}>
          {/* Background rings */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: ORBIT_RADIUS * 2 + 46,
              height: ORBIT_RADIUS * 2 + 46,
              top: CENTER - ORBIT_RADIUS - 23,
              left: CENTER - ORBIT_RADIUS - 23,
              border: "1px solid hsl(var(--hud-cyan) / 0.15)",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          />

          <div
            className="absolute rounded-full"
            style={{
              width: ORBIT_RADIUS * 2,
              height: ORBIT_RADIUS * 2,
              top: CENTER - ORBIT_RADIUS,
              left: CENTER - ORBIT_RADIUS,
              border: "1px solid hsl(var(--hud-cyan) / 0.1)",
            }}
          />

          <motion.div
            className="absolute rounded-full"
            style={{
              width: ORBIT_RADIUS * 2 - 10,
              height: ORBIT_RADIUS * 2 - 10,
              top: CENTER - ORBIT_RADIUS + 5,
              left: CENTER - ORBIT_RADIUS + 5,
              background:
                "conic-gradient(from 0deg, transparent 0%, hsl(var(--hud-cyan) / 0.08) 16%, transparent 32%)",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Rotating dynamic menu */}
          <motion.div
            className="absolute inset-0"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
          >
            {ACTIONS.map((action) => {
              const rad = (action.angle * Math.PI) / 180;
              const x = CENTER + ORBIT_RADIUS * Math.cos(rad) - 23;
              const y = CENTER + ORBIT_RADIUS * Math.sin(rad) - 23;

              return (
                <motion.button
                  key={action.label}
                  className="absolute w-[46px] h-[46px] rounded-2xl flex items-center justify-center transition-all cursor-pointer group"
                  style={{
                    top: y,
                    left: x,
                    border: "1px solid hsl(var(--hud-cyan) / 0.25)",
                    background: "hsl(var(--hud-surface) / 0.9)",
                    boxShadow: "0 0 16px hsl(var(--hud-cyan) / 0.1)",
                  }}
                  whileHover={{ scale: 1.08, borderColor: "hsl(var(--hud-cyan) / 0.6)" }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    haptic("light");
                    navigate(action.path);
                  }}
                  title={action.label}
                >
                  <motion.div
                    className="flex flex-col items-center"
                    animate={reduceMotion ? undefined : { rotate: -360 }}
                    transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
                  >
                    <action.icon className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
                    <span
                      className="absolute -bottom-[18px] text-[8px] font-semibold tracking-wide whitespace-nowrap transition-colors"
                      style={{ color: "hsl(var(--hud-text-dim))" }}
                    >
                      {action.label}
                    </span>
                  </motion.div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Center core */}
          <div
            className="absolute flex flex-col items-center justify-center rounded-full"
            style={{
              width: 124,
              height: 124,
              top: CENTER - 62,
              left: CENTER - 62,
              border: "1px solid hsl(var(--hud-cyan) / 0.2)",
              background: "radial-gradient(circle, hsl(var(--hud-cyan) / 0.12) 0%, transparent 72%)",
              boxShadow: "0 0 28px hsl(var(--hud-cyan) / 0.15)",
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Building className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
              <span className="text-xl font-bold tabular-nums" style={{ color: "hsl(var(--hud-text))" }}>
                {totalProperties}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {t("common.properties") || "Properties"}
            </span>
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }} />
              <span className="text-xs font-semibold tabular-nums" style={{ color: "hsl(var(--hud-text))" }}>
                {totalCountries}
              </span>
              <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {t("page.dashboard.countries_short") || "countries"}
              </span>
            </div>
          </div>

          {/* orbit nodes */}
          {[20, 74, 128, 182, 236, 290, 344].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const px = CENTER + ORBIT_RADIUS * Math.cos(rad) - 2;
            const py = CENTER + ORBIT_RADIUS * Math.sin(rad) - 2;
            return (
              <motion.div
                key={angle}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ top: py, left: px, background: "hsl(var(--hud-cyan) / 0.5)" }}
                animate={{ opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4 }}
              />
            );
          })}
        </div>
      </div>

      {/* Country chips — horizontal scroll */}
      {propertiesByCountry.length > 0 && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth -mx-1 px-1 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {propertiesByCountry.map((c, i) => (
              <motion.button
                key={c.code}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all text-xs cursor-pointer"
                style={{
                  background: "hsl(var(--hud-surface))",
                  border: "1px solid hsl(var(--hud-border) / 0.12)",
                  color: "hsl(var(--hud-text))",
                }}
                onClick={() => {
                  haptic("light");
                  navigate(`/dashboard/country/${c.code.toLowerCase()}`);
                }}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="font-medium whitespace-nowrap">{c.name}</span>
                <span
                  className="font-bold tabular-nums whitespace-nowrap"
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
