/**
 * RadarPreviewSection — Signature feature: immersive radar with glass card, live dots, sweep animation.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Navigation, Locate, Radio, Star, Clock, Zap } from "lucide-react";

const NEARBY_ITEMS = [
  { name: "La Maison Sushi", dist: "0.3 km", rating: "4.9", emoji: "🍣", eta: "8 min" },
  { name: "Quick Ride", dist: "0.1 km", emoji: "🚗", eta: "2 min" },
  { name: "FreshMart", dist: "0.5 km", rating: "4.7", emoji: "🛒", eta: "12 min" },
];

export default function RadarPreviewSection() {
  return (
    <section className="py-12 sm:py-20 relative overflow-hidden" aria-label="Live Radar">
      {/* Deep background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(230 45% 6%) 30%, hsl(230 45% 6%) 70%, hsl(var(--background)) 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Left — Radar visual */}
          <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
            <div className="aspect-square relative">
              {/* Outer glow */}
              <div className="absolute inset-[-20%] rounded-full bg-accent/5 blur-3xl" />

              {/* Rings */}
              {[1, 2, 3, 4].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute rounded-full border"
                  style={{
                    width: `${ring * 25}%`,
                    height: `${ring * 25}%`,
                    top: `${50 - ring * 12.5}%`,
                    left: `${50 - ring * 12.5}%`,
                    borderColor: `hsl(var(--accent) / ${0.15 - ring * 0.02})`,
                  }}
                  animate={{ scale: [1, 1.03, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, delay: ring * 0.6 }}
                />
              ))}

              {/* Sweep line */}
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              >
                <div
                  className="absolute top-1/2 left-1/2 w-1/2 h-[2px] origin-left"
                  style={{
                    background: "linear-gradient(90deg, hsl(var(--accent) / 0.6), transparent)",
                  }}
                />
              </motion.div>

              {/* Center beacon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <motion.div
                  className="w-5 h-5 rounded-full bg-accent shadow-[0_0_20px_4px_hsl(var(--accent)/0.4)]"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Scatter points with labels */}
              {[
                { top: "18%", left: "62%", color: "hsl(15 80% 55%)", label: "🍕", delay: 0 },
                { top: "32%", left: "22%", color: "hsl(142 60% 45%)", label: "🛒", delay: 0.5 },
                { top: "68%", left: "72%", color: "hsl(250 65% 55%)", label: "🏨", delay: 1 },
                { top: "72%", left: "28%", color: "hsl(38 65% 50%)", label: "🏠", delay: 1.5 },
                { top: "42%", left: "82%", color: "hsl(270 60% 55%)", label: "🚗", delay: 0.8 },
                { top: "25%", left: "45%", color: "hsl(220 70% 55%)", label: "🔧", delay: 1.2 },
              ].map((dot, i) => (
                <motion.div
                  key={i}
                  className="absolute z-10 flex items-center justify-center"
                  style={{ top: dot.top, left: dot.left }}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: dot.delay + 0.5, type: "spring", stiffness: 200 }}
                >
                  <motion.div
                    className="w-8 h-8 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center text-sm shadow-lg"
                    style={{ background: `${dot.color}30`, boxShadow: `0 0 12px ${dot.color}40` }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                  >
                    {dot.label}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — Content + glass cards */}
          <div className="flex-1 text-center lg:text-left space-y-5 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 bg-accent/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Live Radar</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              Discover Everything{" "}
              <span className="text-accent">Around You</span>
            </h2>

            <p className="text-sm sm:text-base text-white/50">
              Restaurants, services, properties, rides — all on a live interactive map with real-time availability.
            </p>

            {/* Mini glass cards — nearby items */}
            <div className="space-y-2">
              {NEARBY_ITEMS.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-lg"
                >
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <span className="flex items-center gap-0.5"><Locate className="h-2.5 w-2.5" />{item.dist}</span>
                      {item.rating && <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />{item.rating}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{item.eta}</span>
                    </div>
                  </div>
                  <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                </motion.div>
              ))}
            </div>

            <Link
              to="/radar"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white group-hover:gap-3 transition-all"
              style={{ background: "var(--gradient-gold, linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.7)))" }}
            >
              <Navigation className="h-4 w-4" />
              Open Radar
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
