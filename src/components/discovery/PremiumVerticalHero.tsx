/**
 * PremiumVerticalHero — Immersive hero section with background image, gradient overlay,
 * animated particles, and vertical-specific theming.
 */
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { VerticalTheme } from "@/lib/discovery/vertical-themes";

interface Props {
  title: string;
  tagline: string;
  emoji: string;
  theme: VerticalTheme;
  search?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PremiumVerticalHero({ title, tagline, emoji, theme, search, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-b-[2rem]" style={{ minHeight: 200 }}>
      {/* Background image */}
      <div className="absolute inset-0">
        <motion.img
          src={theme.heroImage}
          alt={`${title} hero banner`}
          className="w-full h-full object-cover"
          loading="eager"
          animate={{ scale: [1, 1.06, 1], x: [0, -10, 0], y: [0, 8, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: theme.heroOverlay }} />

      {/* Animated shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 70% 30%, hsla(0,0%,100%,0.08) 0%, transparent 60%)",
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, hsla(0,0%,100%,0.08) 35%, transparent 100%)",
        }}
        animate={{ x: ["-10%", "10%", "-10%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: "hsla(0,0%,100%,0.3)",
              left: `${15 + i * 18}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [-10, -30, -10],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.7,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "hsla(0,0%,100%,0.16)", border: "1px solid hsla(0,0%,100%,0.12)" }}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <motion.span
            className="text-2xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {emoji}
          </motion.span>
          <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        </div>
        <p className="text-sm text-white/70 ml-[3.25rem] font-medium">{tagline}</p>
        {children}
      </div>

      {/* Bottom fade for search overlap */}
      <div className="absolute bottom-0 left-0 right-0 h-8" style={{
        background: "linear-gradient(to top, hsl(var(--background)), transparent)"
      }} />

      {/* Search bar floating */}
      {search && (
        <div className="relative z-20 px-4 -mb-5 pb-1">
          {search}
        </div>
      )}
    </div>
  );
}
