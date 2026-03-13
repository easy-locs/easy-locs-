/**
 * OrbitSpinner — Orbit-themed loading spinner with rotating rings.
 */
import { motion } from "framer-motion";

interface Props {
  size?: number;
  className?: string;
  label?: string;
}

export default function OrbitSpinner({ size = 48, className = "", label }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid hsl(var(--accent) / 0.15)",
            borderTopColor: "hsl(var(--accent))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: size * 0.2,
            left: size * 0.2,
            width: size * 0.6,
            height: size * 0.6,
            border: "2px solid hsl(var(--accent) / 0.1)",
            borderBottomColor: "hsl(var(--accent) / 0.6)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        {/* Center dot */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: size * 0.42,
            left: size * 0.42,
            width: size * 0.16,
            height: size * 0.16,
            background: "hsl(var(--accent))",
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
