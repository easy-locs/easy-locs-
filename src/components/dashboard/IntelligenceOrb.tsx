/**
 * IntelligenceOrb — Futuristic HUD-style central brain.
 * Inspired by spaceship control panels & holographic scanners.
 * Concentric radar rings, scanning beam, glowing nodes, neon aesthetic.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Building, ShoppingBag, MessageSquare,
  Handshake, Globe, CreditCard,
} from "lucide-react";

const MENU_ITEMS = [
  { icon: Building, label: "Properties", path: "/dashboard" },
  { icon: ShoppingBag, label: "Marketplace", path: "/dashboard/concierge" },
  { icon: MessageSquare, label: "Hub", path: "/dashboard/communication" },
  { icon: Handshake, label: "Deals", path: "/dashboard/marketplace" },
  { icon: Globe, label: "Countries", path: "/dashboard" },
  { icon: CreditCard, label: "Payments", path: "/dashboard/billing" },
];

/* Small gleach node on rings — represents active conversations/users */
const NODES = [
  { ring: 1, angle: 30 },
  { ring: 1, angle: 150 },
  { ring: 1, angle: 260 },
  { ring: 2, angle: 70 },
  { ring: 2, angle: 190 },
  { ring: 2, angle: 310 },
  { ring: 3, angle: 20 },
  { ring: 3, angle: 120 },
  { ring: 3, angle: 220 },
  { ring: 3, angle: 340 },
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
    (path: string) => { setOpen(false); navigate(path); },
    [navigate],
  );

  const coreSize = 72;
  const viewBox = 320;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const rings = [48, 72, 100, 128];
  const menuRadius = 110;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: viewBox, height: viewBox }}
    >
      {/* ── SVG HUD Layer ── */}
      <svg
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        className="absolute inset-0 pointer-events-none"
        style={{ width: viewBox, height: viewBox }}
      >
        <defs>
          {/* Neon glow filter */}
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradient for core */}
          <radialGradient id="coreGrad" cx="45%" cy="40%">
            <stop offset="0%" stopColor="hsl(195, 100%, 60%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(210, 100%, 50%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(240, 80%, 40%)" stopOpacity="0.05" />
          </radialGradient>
          {/* Sweep gradient for scanner */}
          <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(180, 100%, 60%)" stopOpacity="0" />
            <stop offset="70%" stopColor="hsl(180, 100%, 60%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(180, 100%, 70%)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Ambient background glow */}
        <circle cx={cx} cy={cy} r={130} fill="hsl(210, 100%, 50%)" opacity="0.03" filter="url(#softGlow)" />

        {/* Concentric radar rings */}
        {rings.map((r, i) => (
          <circle
            key={`ring-${i}`}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="hsl(195, 100%, 55%)"
            strokeWidth={i === 0 ? 1.2 : 0.6}
            opacity={0.15 + (i === 0 ? 0.15 : 0)}
            strokeDasharray={i > 1 ? "3 6" : "none"}
          />
        ))}

        {/* Cross-hair lines */}
        {[0, 45, 90, 135].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const inner = 30;
          const outer = 128;
          return (
            <line
              key={`xhair-${angle}`}
              x1={cx + Math.cos(rad) * inner}
              y1={cy + Math.sin(rad) * inner}
              x2={cx + Math.cos(rad) * outer}
              y2={cy + Math.sin(rad) * outer}
              stroke="hsl(195, 100%, 55%)"
              strokeWidth="0.3"
              opacity="0.12"
            />
          );
        })}

        {/* Scanning beam — rotating wedge */}
        <g filter="url(#neonGlow)">
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{ originX: `${cx}px`, originY: `${cy}px`, transformOrigin: `${cx}px ${cy}px` }}
          >
            <path
              d={`M ${cx} ${cy} L ${cx + 128} ${cy} A 128 128 0 0 1 ${cx + 128 * Math.cos(Math.PI / 6)} ${cy + 128 * Math.sin(Math.PI / 6)} Z`}
              fill="url(#scanGrad)"
              opacity="0.5"
            />
          </motion.g>
        </g>

        {/* Second scanner — slower, opposite */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${cx}px`, originY: `${cy}px`, transformOrigin: `${cx}px ${cy}px` }}
        >
          <line
            x1={cx} y1={cy}
            x2={cx + 128} y2={cy}
            stroke="hsl(270, 80%, 65%)"
            strokeWidth="0.8"
            opacity="0.25"
            filter="url(#neonGlow)"
          />
        </motion.g>

        {/* Active nodes on rings */}
        {NODES.map((node, i) => {
          const r = rings[node.ring];
          const rad = (node.angle * Math.PI) / 180;
          const nx = cx + Math.cos(rad) * r;
          const ny = cy + Math.sin(rad) * r;
          return (
            <g key={`node-${i}`}>
              {/* Connection line to core */}
              <line
                x1={cx} y1={cy} x2={nx} y2={ny}
                stroke="hsl(195, 100%, 55%)"
                strokeWidth="0.3"
                opacity="0.08"
              />
              {/* Node dot */}
              <motion.circle
                cx={nx} cy={ny} r={2}
                fill="hsl(180, 100%, 65%)"
                filter="url(#neonGlow)"
                animate={{ opacity: [0.3, 0.9, 0.3], r: [1.5, 2.5, 1.5] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
              />
            </g>
          );
        })}

        {/* Activity pulse rings — when hasActivity */}
        {hasActivity && (
          <>
            <motion.circle
              cx={cx} cy={cy} r={48}
              fill="none"
              stroke="hsl(180, 100%, 60%)"
              strokeWidth="1.5"
              initial={{ r: 30, opacity: 0.6 }}
              animate={{ r: 140, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.circle
              cx={cx} cy={cy} r={48}
              fill="none"
              stroke="hsl(270, 80%, 65%)"
              strokeWidth="1"
              initial={{ r: 40, opacity: 0.4 }}
              animate={{ r: 120, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1 }}
            />
          </>
        )}

        {/* Core orb — glowing center */}
        <circle cx={cx} cy={cy} r={coreSize / 2} fill="url(#coreGrad)" filter="url(#neonGlow)" />
        <circle cx={cx} cy={cy} r={coreSize / 2} fill="none" stroke="hsl(195, 100%, 60%)" strokeWidth="1.2" opacity="0.5" />
        {/* Inner bright ring */}
        <circle cx={cx} cy={cy} r={coreSize / 2 - 6} fill="none" stroke="hsl(180, 100%, 65%)" strokeWidth="0.6" opacity="0.3" />
        {/* Specular highlight */}
        <ellipse cx={cx - 8} cy={cy - 10} rx={10} ry={5} fill="white" opacity="0.08" />

        {/* Radial menu connection lines — when open */}
        <AnimatePresence>
          {open && MENU_ITEMS.map((_, i) => {
            const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
            const ex = cx + Math.cos(angle) * menuRadius;
            const ey = cy + Math.sin(angle) * menuRadius;
            return (
              <motion.line
                key={`menu-line-${i}`}
                x1={cx} y1={cy} x2={ex} y2={ey}
                stroke="hsl(195, 100%, 55%)"
                strokeWidth="0.8"
                strokeDasharray="4 3"
                filter="url(#neonGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* ── Clickable core button ── */}
      <motion.button
        onClick={toggle}
        className="absolute z-10 rounded-full cursor-pointer select-none focus-visible:outline-none"
        style={{
          width: coreSize + 8,
          height: coreSize + 8,
          left: cx - (coreSize + 8) / 2,
          top: cy - (coreSize + 8) / 2,
          background: "transparent",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Open quick access"
      />

      {/* ── Radial menu items ── */}
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
              const x = Math.cos(angle) * menuRadius;
              const y = Math.sin(angle) * menuRadius;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.label}
                  className="absolute z-20 flex flex-col items-center gap-1 cursor-pointer select-none focus-visible:outline-none group"
                  style={{
                    left: cx + x - 24,
                    top: cy + y - 24,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22, delay: i * 0.04 }}
                  onClick={() => handleSelect(item.path)}
                  aria-label={item.label}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: "hsl(210, 50%, 12%)",
                      border: "1px solid hsl(195, 100%, 55%, 0.3)",
                      boxShadow: "0 0 12px hsl(195, 100%, 55%, 0.15), inset 0 0 8px hsl(195, 100%, 55%, 0.05)",
                    }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: "hsl(180, 100%, 65%)" }} />
                  </div>
                  <span
                    className="text-[9px] font-semibold tracking-wide uppercase whitespace-nowrap"
                    style={{ color: "hsl(195, 100%, 65%, 0.7)" }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
