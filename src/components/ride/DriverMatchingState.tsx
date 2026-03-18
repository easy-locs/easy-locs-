/**
 * DriverMatchingState — Animated state: searching → matched → tracking.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Car, Phone, MessageSquare, Star, Navigation } from "lucide-react";

export type MatchState = "searching" | "matched" | "arriving" | "in_ride";

interface Props {
  state: MatchState;
  onStateChange?: (state: MatchState) => void;
}

const MOCK_DRIVER = {
  name: "Mohamed K.",
  rating: 4.9,
  trips: 1247,
  car: "Toyota Corolla · Gray",
  plate: "AB-123-CD",
  eta: "3 min",
  avatar: "🧑‍✈️",
};

export default function DriverMatchingState({ state, onStateChange }: Props) {
  // Auto-advance for demo
  useEffect(() => {
    if (state === "searching") {
      const t = setTimeout(() => onStateChange?.("matched"), 3000);
      return () => clearTimeout(t);
    }
    if (state === "matched") {
      const t = setTimeout(() => onStateChange?.("arriving"), 4000);
      return () => clearTimeout(t);
    }
  }, [state, onStateChange]);

  if (state === "searching") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 mx-auto rounded-full border-2 border-primary border-t-transparent"
        />
        <p className="text-sm font-bold text-foreground">Finding your driver…</p>
        <p className="text-[10px] text-muted-foreground">Matching with the nearest available driver</p>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/15 bg-card p-4 space-y-3"
    >
      {/* Driver info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
          {MOCK_DRIVER.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{MOCK_DRIVER.name}</p>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-warning/10">
              <Star className="h-2.5 w-2.5 text-warning fill-warning" />
              <span className="text-[9px] font-bold text-warning">{MOCK_DRIVER.rating}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">{MOCK_DRIVER.car}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{MOCK_DRIVER.plate}</p>
        </div>
        <div className="text-right">
          {state === "matched" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-1 rounded-full bg-success/10"
            >
              <p className="text-[10px] font-bold text-success">Driver matched!</p>
            </motion.div>
          )}
          {state === "arriving" && (
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{MOCK_DRIVER.eta}</p>
              <p className="text-[9px] text-muted-foreground">arriving</p>
            </div>
          )}
          {state === "in_ride" && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
              <Navigation className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">In ride</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 h-10 rounded-xl bg-muted/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <Phone className="h-3.5 w-3.5 text-foreground" />
          <span className="text-[10px] font-semibold text-foreground">Call</span>
        </button>
        <button className="flex-1 h-10 rounded-xl bg-muted/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
          <MessageSquare className="h-3.5 w-3.5 text-foreground" />
          <span className="text-[10px] font-semibold text-foreground">Message</span>
        </button>
      </div>

      {/* ETA bar */}
      {(state === "arriving" || state === "in_ride") && (
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>{state === "arriving" ? "Driver arriving" : "En route to destination"}</span>
            <span>{MOCK_DRIVER.eta}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "10%" }}
              animate={{ width: state === "arriving" ? "45%" : "70%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
