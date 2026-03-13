/**
 * IntelligenceOrb — Central brain of the platform.
 * A futuristic minimal orb with network nodes, glow, pulse,
 * and a radial quick-access menu on tap.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Building, ShoppingBag, MessageSquare,
  Handshake, Globe, CreditCard,
} from "lucide-react";

const MENU_ITEMS = [
  { icon: Building, label: "Properties", path: "/dashboard", color: "hsl(var(--accent))" },
  { icon: ShoppingBag, label: "Marketplace", path: "/dashboard/concierge", color: "hsl(217 91% 60%)" },
  { icon: MessageSquare, label: "Hub", path: "/dashboard/communication", color: "hsl(142 71% 45%)" },
  { icon: Handshake, label: "Deals", path: "/dashboard/marketplace", color: "hsl(38 92% 50%)" },
  { icon: Globe, label: "Countries", path: "/dashboard", color: "hsl(262 83% 58%)" },
  { icon: CreditCard, label: "Payments", path: "/dashboard/billing", color: "hsl(350 89% 60%)" },
];

interface Props {
  hasActivity?: boolean;
  className?: string;
}

export default function IntelligenceOrb({ hasActivity = false, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const orbSize = 96; // px
  const radius = 88; // distance from center to menu items

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: orbSize * 3, height: orbSize * 3 }}>
      {/* Ambient glow — always visible */}
      <div
        className="absolute rounded-full blur-[60px] pointer-events-none"
        style={{
          width: orbSize * 1.8,
          height: orbSize * 1.8,
          background: "radial-gradient(circle, hsl(var(--accent) / 0.15), transparent 70%)",
        }}
      />

      {/* Sync ring — spins continuously */}
      <motion.div
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: orbSize + 28,
          height: orbSize + 28,
          borderColor: "hsl(var(--accent) / 0.12)",
          borderTopColor: "hsl(var(--accent) / 0.4)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Second ring — counter-rotate */}
      <motion.div
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: orbSize + 44,
          height: orbSize + 44,
          borderColor: "hsl(var(--accent) / 0.06)",
          borderBottomColor: "hsl(var(--accent) / 0.2)",
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Network nodes on outer ring — 6 small dots */}
      {MENU_ITEMS.map((_, i) => {
        const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * ((orbSize + 44) / 2);
        const y = Math.sin(angle) * ((orbSize + 44) / 2);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 4,
              height: 4,
              background: "hsl(var(--accent) / 0.4)",
              left: `calc(50% + ${x}px - 2px)`,
              top: `calc(50% + ${y}px - 2px)`,
            }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        );
      })}

      {/* Activity pulse — only when hasActivity */}
      <AnimatePresence>
        {hasActivity && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orbSize + 16,
              height: orbSize + 16,
              border: "2px solid hsl(var(--accent) / 0.3)",
            }}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Core orb — clickable */}
      <motion.button
        onClick={toggle}
        className="relative z-10 rounded-full flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          width: orbSize,
          height: orbSize,
          background: `radial-gradient(circle at 40% 35%, hsl(var(--accent) / 0.25), hsl(var(--accent) / 0.08) 60%, hsl(var(--background) / 0.9))`,
          boxShadow: `0 0 40px hsl(var(--accent) / 0.15), inset 0 0 30px hsl(var(--accent) / 0.06)`,
          border: "1px solid hsl(var(--accent) / 0.2)",
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Open quick access"
      >
        {/* Inner glow orb */}
        <div
          className="rounded-full"
          style={{
            width: orbSize * 0.45,
            height: orbSize * 0.45,
            background: `radial-gradient(circle, hsl(var(--accent) / 0.5), hsl(var(--accent) / 0.15) 70%, transparent)`,
            boxShadow: `0 0 20px hsl(var(--accent) / 0.3)`,
          }}
        />
        {/* Specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            width: 18,
            height: 10,
            top: "22%",
            left: "30%",
            background: "hsl(var(--primary-foreground) / 0.12)",
            filter: "blur(4px)",
            borderRadius: "50%",
          }}
        />
      </motion.button>

      {/* Radial menu */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {MENU_ITEMS.map((item, i) => {
              const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.label}
                  className="absolute z-20 flex flex-col items-center gap-1 cursor-pointer select-none focus-visible:outline-none group"
                  style={{
                    left: `calc(50% + ${x}px - 24px)`,
                    top: `calc(50% + ${y}px - 24px)`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22, delay: i * 0.04 }}
                  onClick={() => handleSelect(item.path)}
                  aria-label={item.label}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 border"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--card)), hsl(var(--card) / 0.9))`,
                      borderColor: "hsl(var(--border) / 0.6)",
                      boxShadow: `0 4px 20px hsl(var(--accent) / 0.12)`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold whitespace-nowrap"
                    style={{ color: "hsl(var(--foreground) / 0.7)" }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* Connection lines from center to each item */}
            <svg
              className="absolute inset-0 pointer-events-none z-[5]"
              viewBox={`0 0 ${orbSize * 3} ${orbSize * 3}`}
              style={{ width: orbSize * 3, height: orbSize * 3 }}
            >
              {MENU_ITEMS.map((_, i) => {
                const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
                const cx = orbSize * 1.5;
                const cy = orbSize * 1.5;
                const ex = cx + Math.cos(angle) * radius;
                const ey = cy + Math.sin(angle) * radius;
                return (
                  <motion.line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={ex}
                    y2={ey}
                    stroke="hsl(var(--accent) / 0.15)"
                    strokeWidth="1"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                  />
                );
              })}
            </svg>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
