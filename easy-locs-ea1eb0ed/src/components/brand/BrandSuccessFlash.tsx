import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EasyLocsIcon } from "./EasyLocsLogo";
import type { DynamicLogoProps } from "./EasyLocsLogo";

let _trigger: ((ctx?: DynamicLogoProps) => void) | null = null;

export function triggerBrandFlash(ctx?: DynamicLogoProps) {
  _trigger?.(ctx);
}

export default function BrandSuccessFlash() {
  const [visible, setVisible] = useState(false);
  const [dynamicCtx, setDynamicCtx] = useState<DynamicLogoProps | undefined>();

  _trigger = useCallback((ctx?: DynamicLogoProps) => {
    setDynamicCtx(ctx);
    setVisible(true);
    setTimeout(() => setVisible(false), 1200);
  }, []);

  const accentColor = dynamicCtx?.gradientColors?.[0] ?? "hsl(168 72% 44%)";

  function withAlpha(color: string, alpha: number): string {
    const m = color.match(/^hsl\(([^)]+)\)$/);
    if (m) return `hsl(${m[1]} / ${alpha})`;
    return color;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-6 left-1/2 z-fullscreen pointer-events-none"
          initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.7 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: -10, x: "-50%", scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div
            className="p-3 rounded-2xl relative overflow-hidden"
            style={{
              background: "hsl(228 28% 9% / 0.95)",
              boxShadow: `0 0 30px ${withAlpha(accentColor, 0.3)}, 0 4px 20px hsl(228 28% 7% / 0.5)`,
              backdropFilter: "blur(12px)",
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                background: `radial-gradient(circle at center, ${withAlpha(accentColor, 0.2)}, transparent 70%)`,
              }}
            />
            <div className="relative z-10">
              <EasyLocsIcon size={28} animate dynamic={dynamicCtx} />
            </div>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 60 44"
              fill="none"
            >
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={20 + i * 10}
                  cy={22}
                  r={1}
                  fill={accentColor}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 0.8, 0], y: [0, -8, -16] }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                />
              ))}
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
