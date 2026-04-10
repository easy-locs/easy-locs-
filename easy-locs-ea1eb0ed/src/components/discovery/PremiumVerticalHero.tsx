import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
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
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const showVideo = !!theme.heroVideo && !videoError;

  return (
    <div className="relative overflow-hidden rounded-b-[2rem]" style={{ height: 280 }}>
      {showVideo && (
        <video
          ref={videoRef}
          src={theme.heroVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: videoLoaded ? 1 : 0 }}
        />
      )}

      {(!showVideo || !videoLoaded) && (
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
      )}

      <div className="absolute inset-0" style={{ background: theme.heroOverlay }} />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 35%, hsla(0,0%,100%,0.07) 50%, transparent 65%)",
        }}
        animate={{ x: ["-150%", "250%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
      />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 70% 30%, hsla(0,0%,100%,0.1) 0%, transparent 55%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

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

      <div className="relative z-10 px-4 pt-12 pb-10">
        <div className="flex items-start gap-3 mb-2 min-w-0">
          <motion.button
            onClick={() => {
              if (window.history.length > 1) { navigate(-1); return; }
              navigate("/");
            }}
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

      <div className="absolute bottom-0 left-0 right-0 h-10" style={{
        background: "linear-gradient(to top, hsl(var(--background)), transparent)"
      }} />

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
