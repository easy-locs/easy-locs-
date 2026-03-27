/**
 * PremiumVerticalHero — Immersive hero section with background image, gradient overlay,
 * animated particles, shimmer effects, and vertical-specific theming.
 * V2: Enhanced with more dynamic animations and depth.
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
    <div className="relative overflow-hidden rounded-b-[2rem]" style={{ minHeight: 240 }}>
      {/* Background image with Ken Burns */}
      <div className="absolute inset-0">
        <motion.img
          src={theme.heroImage}
          alt={`${title} hero banner`}
          className="w-full h-full object-cover"
          loading="eager"
          animate={{ scale: [1, 1.08, 1], x: [0, -12, 0], y: [0, 6, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Gradient overlay — deeper for text legibility */}
      <div className="absolute inset-0" style={{ background: theme.heroOverlay }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsla(0,0%,0%,0.2) 0%, hsla(0,0%,0%,0.4) 60%, hsla(0,0%,0%,0.6) 100%)" }} />

      {/* Animated shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 35%, hsla(0,0%,100%,0.07) 50%, transparent 65%)",
        }}
        animate={{ x: ["-150%", "250%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
      />

      {/* Radial glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 70% 30%, hsla(0,0%,100%,0.1) 0%, transparent 55%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom light sweep */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, hsla(0,0%,100%,0.06) 40%, transparent 100%)",
        }}
        animate={{ x: ["-15%", "15%", "-15%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              background: "hsla(0,0%,100%,0.25)",
              width: i % 2 === 0 ? 4 : 3,
              height: i % 2 === 0 ? 4 : 3,
              left: `${10 + i * 13}%`,
              top: `${25 + (i % 4) * 15}%`,
            }}
            animate={{
              y: [-8, -35, -8],
              opacity: [0.15, 0.5, 0.15],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 3.5 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.6,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-12 pb-10">
        <div className="flex items-start gap-3 mb-2 min-w-0">
          <motion.button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0 backdrop-blur-sm"
            style={{ background: "hsla(0,0%,100%,0.18)", border: "1px solid hsla(0,0%,100%,0.15)" }}
            aria-label="Go back"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </motion.button>
          <motion.span
            className="text-2xl shrink-0 leading-none pt-1 drop-shadow-lg"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {emoji}
          </motion.span>
          <motion.h1
            className="min-w-0 flex-1 text-2xl font-black text-white tracking-tight leading-tight break-words drop-shadow-md"
            style={{ textWrap: "balance" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {title}
          </motion.h1>
        </div>
        <motion.p
          className="ml-[3.25rem] max-w-[calc(100%-3.25rem)] pr-1 text-sm text-white/80 font-medium leading-snug break-words drop-shadow-sm"
          style={{ textWrap: "balance" }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {tagline}
        </motion.p>
        {children}
      </div>

      {/* Bottom fade for search overlap */}
      <div className="absolute bottom-0 left-0 right-0 h-10" style={{
        background: "linear-gradient(to top, hsl(var(--background)), transparent)"
      }} />

      {/* Search bar floating */}
      {search && (
        <motion.div
          className="relative z-20 px-4 -mb-6 pb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {search}
        </motion.div>
      )}
    </div>
  );
}