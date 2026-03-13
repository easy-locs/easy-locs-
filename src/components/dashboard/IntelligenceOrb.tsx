/**
 * IntelligenceOrb — Futuristic HUD-style central brain.
 * True circular orbiting animation, scanning beams, glowing nodes.
 * Radial menu: Chats, Calls, Files, Contacts, Deals, Payments, Security, AI
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Phone, FolderOpen, Users,
  Handshake, CreditCard, Shield, Sparkles,
} from "lucide-react";

const MENU_ITEMS = [
  { icon: MessageSquare, label: "Chats", path: "/dashboard/communication" },
  { icon: Phone, label: "Calls", path: "/dashboard/communication" },
  { icon: FolderOpen, label: "Files", path: "/dashboard/communication" },
  { icon: Users, label: "Contacts", path: "/dashboard/communication" },
  { icon: Handshake, label: "Deals", path: "/dashboard/marketplace" },
  { icon: CreditCard, label: "Payments", path: "/dashboard/billing" },
  { icon: Shield, label: "Security", path: "/dashboard/settings" },
  { icon: Sparkles, label: "AI", path: "/dashboard/assistant" },
];

const NODES = [
  { ring: 1, angle: 30 }, { ring: 1, angle: 150 }, { ring: 1, angle: 260 },
  { ring: 2, angle: 70 }, { ring: 2, angle: 190 }, { ring: 2, angle: 310 },
  { ring: 3, angle: 20 }, { ring: 3, angle: 120 }, { ring: 3, angle: 220 }, { ring: 3, angle: 340 },
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
  const menuRadius = 120;

  // Scan speed varies with activity
  const scanDuration = hasActivity ? 3 : 6;
  const secondaryScanDuration = hasActivity ? 8 : 16;

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
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="coreGrad" cx="45%" cy="40%">
            <stop offset="0%" stopColor="hsl(195, 100%, 60%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(210, 100%, 50%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(240, 80%, 40%)" stopOpacity="0.05" />
          </radialGradient>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(180, 100%, 60%)" stopOpacity="0" />
            <stop offset="70%" stopColor="hsl(180, 100%, 60%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(180, 100%, 70%)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <circle cx={cx} cy={cy} r={130} fill="hsl(210, 100%, 50%)" opacity="0.03" filter="url(#softGlow)" />

        {rings.map((r, i) => (
          <circle key={`ring-${i}`} cx={cx} cy={cy} r={r} fill="none"
            stroke="hsl(195, 100%, 55%)" strokeWidth={i === 0 ? 1.2 : 0.6}
            opacity={0.15 + (i === 0 ? 0.15 : 0)} strokeDasharray={i > 1 ? "3 6" : "none"}
          />
        ))}

        {[0, 45, 90, 135].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line key={`xhair-${angle}`}
              x1={cx + Math.cos(rad) * 30} y1={cy + Math.sin(rad) * 30}
              x2={cx + Math.cos(rad) * 128} y2={cy + Math.sin(rad) * 128}
              stroke="hsl(195, 100%, 55%)" strokeWidth="0.3" opacity="0.12"
            />
          );
        })}

        {/* ── Primary scanning beam — TRUE CIRCULAR via CSS animation on <g> ── */}
        <g filter="url(#neonGlow)">
          <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur={`${scanDuration}s`}
              repeatCount="indefinite"
            />
            <path
              d={`M ${cx} ${cy} L ${cx + 128} ${cy} A 128 128 0 0 1 ${cx + 128 * Math.cos(Math.PI / 6)} ${cy + 128 * Math.sin(Math.PI / 6)} Z`}
              fill="url(#scanGrad)" opacity="0.5"
            />
          </g>
        </g>

        {/* ── Secondary scanner line — counter-rotating ── */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`360 ${cx} ${cy}`}
            to={`0 ${cx} ${cy}`}
            dur={`${secondaryScanDuration}s`}
            repeatCount="indefinite"
          />
          <line x1={cx} y1={cy} x2={cx + 128} y2={cy}
            stroke="hsl(270, 80%, 65%)" strokeWidth="0.8" opacity="0.25" filter="url(#neonGlow)"
          />
        </g>

        {/* ── Network nodes ── */}
        {NODES.map((node, i) => {
          const r = rings[node.ring];
          const rad = (node.angle * Math.PI) / 180;
          const nx = cx + Math.cos(rad) * r;
          const ny = cy + Math.sin(rad) * r;
          return (
            <g key={`node-${i}`}>
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(195, 100%, 55%)" strokeWidth="0.3" opacity="0.08" />
              <circle cx={nx} cy={ny} r={2} fill="hsl(180, 100%, 65%)" filter="url(#neonGlow)">
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="r" values="1.5;2.5;1.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* ── Orbiting dot — true circle via animateMotion ── */}
        <circle r="3" fill="hsl(180, 100%, 70%)" filter="url(#neonGlow)" opacity="0.8">
          <animateMotion
            dur={hasActivity ? "4s" : "8s"}
            repeatCount="indefinite"
            path={`M ${cx + 100} ${cy} A 100 100 0 1 1 ${cx + 100 - 0.01} ${cy}`}
          />
        </circle>
        <circle r="2" fill="hsl(270, 80%, 70%)" filter="url(#neonGlow)" opacity="0.6">
          <animateMotion
            dur={hasActivity ? "5s" : "12s"}
            repeatCount="indefinite"
            path={`M ${cx} ${cy - 72} A 72 72 0 1 1 ${cx - 0.01} ${cy - 72}`}
          />
        </circle>

        {/* ── Activity pulse rings ── */}
        {hasActivity && (
          <>
            <circle cx={cx} cy={cy} r={48} fill="none" stroke="hsl(180, 100%, 60%)" strokeWidth="1.5" opacity="0">
              <animate attributeName="r" values="30;140" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r={48} fill="none" stroke="hsl(270, 80%, 65%)" strokeWidth="1" opacity="0">
              <animate attributeName="r" values="40;120" dur="2.5s" repeatCount="indefinite" begin="1s" />
              <animate attributeName="opacity" values="0.4;0" dur="2.5s" repeatCount="indefinite" begin="1s" />
            </circle>
          </>
        )}

        {/* ── Core ── */}
        <circle cx={cx} cy={cy} r={coreSize / 2} fill="url(#coreGrad)" filter="url(#neonGlow)" />
        <circle cx={cx} cy={cy} r={coreSize / 2} fill="none" stroke="hsl(195, 100%, 60%)" strokeWidth="1.2" opacity="0.5" />
        <circle cx={cx} cy={cy} r={coreSize / 2 - 6} fill="none" stroke="hsl(180, 100%, 65%)" strokeWidth="0.6" opacity="0.3" />
        <ellipse cx={cx - 8} cy={cy - 10} rx={10} ry={5} fill="white" opacity="0.08" />

        {/* ── Menu connection lines ── */}
        <AnimatePresence>
          {open && MENU_ITEMS.map((_, i) => {
            const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
            const ex = cx + Math.cos(angle) * menuRadius;
            const ey = cy + Math.sin(angle) * menuRadius;
            return (
              <motion.line key={`menu-line-${i}`}
                x1={cx} y1={cy} x2={ex} y2={ey}
                stroke="hsl(195, 100%, 55%)" strokeWidth="0.8" strokeDasharray="4 3" filter="url(#neonGlow)"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.4 }}
                exit={{ pathLength: 0, opacity: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}
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
          width: coreSize + 8, height: coreSize + 8,
          left: cx - (coreSize + 8) / 2, top: cy - (coreSize + 8) / 2,
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
            <motion.div className="fixed inset-0 z-0"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            {MENU_ITEMS.map((item, i) => {
              const angle = (i / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * menuRadius;
              const y = Math.sin(angle) * menuRadius;
              const Icon = item.icon;

              return (
                <motion.button key={item.label}
                  className="absolute z-20 flex flex-col items-center gap-1 cursor-pointer select-none focus-visible:outline-none group"
                  style={{ left: cx + x - 22, top: cy + y - 22 }}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22, delay: i * 0.04 }}
                  onClick={() => handleSelect(item.path)}
                  aria-label={item.label}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: "hsl(210, 50%, 12%)",
                      border: "1px solid hsl(195, 100%, 55%, 0.3)",
                      boxShadow: "0 0 12px hsl(195, 100%, 55%, 0.15), inset 0 0 8px hsl(195, 100%, 55%, 0.05)",
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "hsl(180, 100%, 65%)" }} />
                  </div>
                  <span className="text-[8px] font-semibold tracking-wide uppercase whitespace-nowrap"
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
