/**
 * RadarPreviewSection — Interactive radar HUD with real animated map preview,
 * concentric rings, sweep line, floating category pins, and glass cards.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Navigation, Star, Clock, Zap, Radio, MapPin } from "lucide-react";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";

const NEARBY_ITEMS = [
  { name: "La Maison Sushi", dist: "0.3 km", rating: "4.9", emoji: "🍣", eta: "8 min", color: "hsl(15 80% 55%)" },
  { name: "Quick Ride", dist: "0.1 km", emoji: "🚗", eta: "2 min", color: "hsl(270 60% 55%)" },
  { name: "FreshMart", dist: "0.5 km", rating: "4.7", emoji: "🛒", eta: "12 min", color: "hsl(142 60% 45%)" },
  { name: "Plumber Pro", dist: "1.2 km", rating: "4.8", emoji: "🔧", eta: "15 min", color: "hsl(220 70% 55%)" },
];

const RADAR_PINS = [
  { top: "18%", left: "62%", emoji: "🍕", color: "hsl(15 80% 55%)", label: "Pizza", delay: 0 },
  { top: "32%", left: "20%", emoji: "🛒", color: "hsl(142 60% 45%)", label: "Grocery", delay: 0.4 },
  { top: "68%", left: "72%", emoji: "🏨", color: "hsl(250 65% 55%)", label: "Hotel", delay: 0.8 },
  { top: "72%", left: "28%", emoji: "🏠", color: "hsl(38 65% 50%)", label: "Property", delay: 1.2 },
  { top: "42%", left: "80%", emoji: "🚗", color: "hsl(270 60% 55%)", label: "Ride", delay: 0.6 },
  { top: "25%", left: "45%", emoji: "🔧", color: "hsl(220 70% 55%)", label: "Service", delay: 1.0 },
  { top: "55%", left: "50%", emoji: "🍣", color: "hsl(15 70% 50%)", label: "Sushi", delay: 1.4 },
];

export default function RadarPreviewSection() {
  return (
    <section className="py-14 sm:py-24 relative overflow-hidden" aria-label="Live Radar">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(230 48% 5%) 25%, hsl(228 50% 4%) 75%, hsl(var(--background)) 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <EasyLocsLogo variant="icon" size="sm" animate />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--accent))" }}>
              Smart Living Radar
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground">
            Everything Around You. <span className="text-accent">Live.</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Real-time discovery of restaurants, services, rides, and more — all within your radius.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          {/* LEFT — Radar HUD */}
          <motion.div
            className="relative w-full max-w-[340px] lg:max-w-[420px]"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="aspect-square relative">
              {/* Deep glow */}
              <div className="absolute inset-[-30%] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.1) 0%, transparent 55%)" }} />

              {/* Concentric rings */}
              {[1, 2, 3, 4, 5].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute rounded-full"
                  style={{
                    width: `${ring * 20}%`,
                    height: `${ring * 20}%`,
                    top: `${50 - ring * 10}%`,
                    left: `${50 - ring * 10}%`,
                    border: `1px solid hsl(var(--accent) / ${0.25 - ring * 0.03})`,
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: ring * 0.1, duration: 0.5 }}
                />
              ))}

              {/* Sweep line */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--accent) / 0.15) 30deg, transparent 60deg)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />

              {/* Cross-hair lines */}
              <div className="absolute top-1/2 left-[10%] right-[10%] h-px" style={{ background: "hsl(var(--accent) / 0.08)" }} />
              <div className="absolute left-1/2 top-[10%] bottom-[10%] w-px" style={{ background: "hsl(var(--accent) / 0.08)" }} />

              {/* Center beacon */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-4 h-4 rounded-full" style={{ background: "hsl(var(--accent))", boxShadow: "0 0 20px hsl(var(--accent) / 0.5)" }} />
              </motion.div>

              {/* Category pins */}
              {RADAR_PINS.map((pin) => (
                <motion.div
                  key={pin.label}
                  className="absolute z-10 cursor-pointer"
                  style={{ top: pin.top, left: pin.left }}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + pin.delay, type: "spring", stiffness: 300, damping: 15 }}
                  whileHover={{ scale: 1.3, zIndex: 30 }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg"
                    style={{ background: `${pin.color}30` }}
                  >
                    <span className="text-base">{pin.emoji}</span>
                  </div>
                  <motion.div
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[8px] font-bold"
                    style={{ background: "hsl(220 40% 8% / 0.9)", color: pin.color, border: `1px solid ${pin.color}30` }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + pin.delay }}
                  >
                    {pin.label}
                  </motion.div>
                </motion.div>
              ))}

              {/* Pulse rings from center */}
              {[1, 2].map((p) => (
                <motion.div
                  key={p}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ border: "1px solid hsl(var(--accent) / 0.2)" }}
                  animate={{ width: ["0%", "100%"], height: ["0%", "100%"], opacity: [0.6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: p * 1.5, ease: "easeOut" }}
                />
              ))}
            </div>

            {/* LIVE badge */}
            <motion.div
              className="absolute -top-2 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md"
              style={{ background: "hsl(var(--success) / 0.1)", borderColor: "hsl(var(--success) / 0.2)" }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--success))" }} />
              </span>
              <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>LIVE</span>
            </motion.div>
          </motion.div>

          {/* RIGHT — Nearby results */}
          <motion.div
            className="flex-1 max-w-md w-full space-y-3"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Nearby Now</h3>
                <p className="text-xs text-muted-foreground">Within 2km · Smart ranked</p>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "hsl(var(--accent) / 0.08)" }}>
                <Radio className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
                <span className="text-[10px] font-bold" style={{ color: "hsl(var(--accent))" }}>4 found</span>
              </div>
            </div>

            {NEARBY_ITEMS.map((item, i) => (
              <motion.div
                key={item.name}
                className="flex items-center gap-3 p-3 rounded-2xl border backdrop-blur-md"
                style={{
                  background: "linear-gradient(135deg, hsl(220 40% 8% / 0.8), hsl(220 40% 6% / 0.9))",
                  borderColor: `${item.color}15`,
                }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ scale: 1.02, borderColor: `${item.color}40` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                  <span className="text-lg">{item.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Navigation className="w-2.5 h-2.5" />{item.dist}
                    </span>
                    {item.rating && (
                      <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: "hsl(38 90% 55%)" }}>
                        <Star className="w-2.5 h-2.5 fill-current" />{item.rating}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{item.eta}
                    </span>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: item.color }} />
              </motion.div>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <Link
                to="/radar"
                className="group flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--accent) / 0.05))",
                  color: "hsl(var(--accent))",
                  border: "1px solid hsl(var(--accent) / 0.2)",
                }}
              >
                <MapPin className="w-4 h-4" />
                Open Full Radar
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
