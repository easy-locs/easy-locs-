/**
 * OrbitSmartHub — Replaces the broken 3D globe with a smart, animated
 * control center showing portfolio summary + quick-action orbital buttons.
 * Gold HUD aesthetic, lightweight framer-motion animations, mobile-first.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Phone, Radar, ShoppingBag, Plus,
  Building, MapPin,
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
  { icon: Phone, label: "Calls", path: "/dashboard/communication?section=calls", angle: -18 },
  { icon: Radar, label: "Nearby", path: "/dashboard/communication?section=nearby", angle: 54 },
  { icon: ShoppingBag, label: "Market", path: "/dashboard/marketplace", angle: 126 },
  { icon: Plus, label: "Add", path: "/dashboard/add-property", angle: 198 },
];

export default function OrbitSmartHub({ totalProperties, totalCountries, propertiesByCountry }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const ORBIT_RADIUS = 105; // px from center
  const CENTER = 130; // half of container 260px

  return (
    <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
      {/* Orbit Ring Area */}
      <div className="relative mx-auto" style={{ width: 260, height: 260 }}>
        {/* Outer glow ring */}
        <motion.div
          className="absolute rounded-full border border-accent/20"
          style={{
            width: ORBIT_RADIUS * 2 + 44,
            height: ORBIT_RADIUS * 2 + 44,
            top: CENTER - ORBIT_RADIUS - 22,
            left: CENTER - ORBIT_RADIUS - 22,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />

        {/* Orbit track */}
        <div
          className="absolute rounded-full border border-accent/10"
          style={{
            width: ORBIT_RADIUS * 2,
            height: ORBIT_RADIUS * 2,
            top: CENTER - ORBIT_RADIUS,
            left: CENTER - ORBIT_RADIUS,
          }}
        />

        {/* Scanning sweep */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: ORBIT_RADIUS * 2 - 10,
            height: ORBIT_RADIUS * 2 - 10,
            top: CENTER - ORBIT_RADIUS + 5,
            left: CENTER - ORBIT_RADIUS + 5,
            background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--accent) / 0.06) 15%, transparent 30%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Center circle — portfolio summary */}
        <div
          className="absolute flex flex-col items-center justify-center rounded-full border border-accent/20"
          style={{
            width: 120,
            height: 120,
            top: CENTER - 60,
            left: CENTER - 60,
            background: "radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, transparent 70%)",
          }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Building className="h-3.5 w-3.5 text-accent" />
            <span className="text-xl font-bold text-foreground tabular-nums">{totalProperties}</span>
          </div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {t("common.properties") || "Properties"}
          </span>
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="h-3 w-3 text-accent/70" />
            <span className="text-xs font-semibold text-foreground tabular-nums">{totalCountries}</span>
            <span className="text-[9px] text-muted-foreground">
              {t("page.dashboard.countries_short") || "countries"}
            </span>
          </div>
        </div>

        {/* Orbital action buttons */}
        {ACTIONS.map((action, i) => {
          const rad = (action.angle * Math.PI) / 180;
          const x = CENTER + ORBIT_RADIUS * Math.cos(rad) - 20;
          const y = CENTER + ORBIT_RADIUS * Math.sin(rad) - 20;

          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 260 }}
              className="absolute w-10 h-10 rounded-full flex items-center justify-center border border-accent/25 hover:border-accent/60 hover:scale-110 transition-all cursor-pointer group"
              style={{
                top: y,
                left: x,
                background: "hsl(var(--card))",
                boxShadow: "0 0 12px hsl(var(--accent) / 0.1)",
              }}
              onClick={() => {
                haptic("light");
                navigate(action.path);
              }}
              title={action.label}
            >
              <action.icon className="h-4 w-4 text-accent group-hover:text-accent" />
              {/* Label tooltip */}
              <span className="absolute -bottom-5 text-[8px] font-semibold text-muted-foreground group-hover:text-accent transition-colors whitespace-nowrap">
                {action.label}
              </span>
            </motion.button>
          );
        })}

        {/* Pulsing dots on orbit track */}
        {[45, 165, 285].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const px = CENTER + ORBIT_RADIUS * Math.cos(rad) - 2;
          const py = CENTER + ORBIT_RADIUS * Math.sin(rad) - 2;
          return (
            <motion.div
              key={angle}
              className="absolute w-1 h-1 rounded-full bg-accent/40"
              style={{ top: py, left: px }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
            />
          );
        })}
      </div>

      {/* Country stats strip below orbit */}
      {propertiesByCountry.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {propertiesByCountry.slice(0, 5).map((c) => (
            <motion.button
              key={c.code}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/40 hover:border-accent/30 bg-muted/30 hover:bg-accent/5 transition-all text-xs cursor-pointer"
              onClick={() => {
                haptic("light");
                navigate(`/dashboard/country/${c.code.toLowerCase()}`);
              }}
            >
              <span className="text-sm">{c.flag}</span>
              <span className="font-medium text-foreground">{c.count}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
