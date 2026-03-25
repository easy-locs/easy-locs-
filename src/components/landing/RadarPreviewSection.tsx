/**
 * RadarPreviewSection — Signature radar HUD with animated rings, sweep, floating pins, glass cards.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Navigation, Locate, Star, Clock, Zap, Radio } from "lucide-react";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";

const NEARBY_ITEMS = [
  { name: "La Maison Sushi", dist: "0.3 km", rating: "4.9", emoji: "🍣", eta: "8 min", color: "hsl(15 80% 55%)" },
  { name: "Quick Ride", dist: "0.1 km", emoji: "🚗", eta: "2 min", color: "hsl(270 60% 55%)" },
  { name: "FreshMart", dist: "0.5 km", rating: "4.7", emoji: "🛒", eta: "12 min", color: "hsl(142 60% 45%)" },
  { name: "Plumber Pro", dist: "1.2 km", rating: "4.8", emoji: "🔧", eta: "15 min", color: "hsl(220 70% 55%)" },
];

const RADAR_PINS = [
  { top: "15%", left: "65%", emoji: "🍕", color: "hsl(15 80% 55%)", label: "Pizza", delay: 0 },
  { top: "30%", left: "18%", emoji: "🛒", color: "hsl(142 60% 45%)", label: "Grocery", delay: 0.4 },
  { top: "70%", left: "75%", emoji: "🏨", color: "hsl(250 65% 55%)", label: "Hotel", delay: 0.8 },
  { top: "75%", left: "25%", emoji: "🏠", color: "hsl(38 65% 50%)", label: "Property", delay: 1.2 },
  { top: "40%", left: "82%", emoji: "🚗", color: "hsl(270 60% 55%)", label: "Ride", delay: 0.6 },
  { top: "22%", left: "42%", emoji: "🔧", color: "hsl(220 70% 55%)", label: "Service", delay: 1.0 },
  { top: "58%", left: "52%", emoji: "🍣", color: "hsl(15 70% 50%)", label: "Sushi", delay: 1.4 },
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
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

          {/* LEFT — Radar HUD */}
          <div className="relative w-full max-w-[340px] lg:max-w-[420px]">
            <div className="aspect-square relative">
              {/* Deep outer glow */}
              <div className="absolute inset-[-30%] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, transparent 60%)" }} />

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
                    border: `1px solid hsl(var(--accent) / ${0.2 - ring * 0.03})`,
                  }}
                  animate={{ scale: [1, 1.02, 1], opacity: [0.4, 0.65, 0.4] }}
                  transition={{ duration: 5, repeat: Infinity, delay: ring * 0.5 }}
                />
              ))}

              {/* Cross-hair lines */}
              <div className="absolute top-0 left-1/2 w-px h-full" style={{ background: "linear-gradient(180deg, transparent, hsl(var(--accent) / 0.08), transparent)" }} />
              <div className="absolute top-1/2 left-0 w-full h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.08), transparent)" }} />

              {/* Sweep line */}
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              >
                <div
                  className="absolute top-1/2 left-1/2 w-1/2 h-[2px] origin-left"
                  style={{ background: "linear-gradient(90deg, hsl(var(--accent) / 0.7), hsl(var(--accent) / 0.1), transparent)" }}
                />
                {/* Sweep cone */}
                <div
                  className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left"
                  style={{
                    background: "conic-gradient(from -5deg, hsl(var(--accent) / 0.12), transparent 40deg)",
                    transform: "rotate(-20deg)",
                    borderRadius: "0 100% 0 0",
                  }}
                />
              </motion.div>

              {/* Center beacon with logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <motion.div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle, hsl(var(--accent) / 0.25), hsl(var(--accent) / 0.05))",
                    boxShadow: "0 0 30px 8px hsl(var(--accent) / 0.15)",
                  }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: "hsl(var(--accent))", boxShadow: "0 0 12px hsl(var(--accent) / 0.6)" }} />
                </motion.div>
              </div>

              {/* Floating pins */}
              {RADAR_PINS.map((pin, i) => (
                <motion.div
                  key={i}
                  className="absolute z-10"
                  style={{ top: pin.top, left: pin.left }}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: pin.delay + 0.3, type: "spring", stiffness: 180 }}
                >
                  <motion.div
                    className="w-9 h-9 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center text-sm shadow-lg cursor-default"
                    style={{ background: `${pin.color}25`, boxShadow: `0 0 16px ${pin.color}30` }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {pin.emoji}
                  </motion.div>
                  {/* Label tooltip */}
                  <span
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-wide uppercase whitespace-nowrap"
                    style={{ color: pin.color }}
                  >
                    {pin.label}
                  </span>
                </motion.div>
              ))}

              {/* Radius label */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full border text-[9px] font-bold" style={{ background: "hsl(220 40% 8% / 0.8)", borderColor: "hsl(var(--accent) / 0.2)", color: "hsl(var(--accent) / 0.7)" }}>
                5 km radius
              </div>
            </div>
          </div>

          {/* RIGHT — Content + cards */}
          <div className="flex-1 text-center lg:text-left space-y-6 max-w-lg">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border" style={{ borderColor: "hsl(var(--accent) / 0.2)", background: "hsl(var(--accent) / 0.08)" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--success))" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--success))" }} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--accent))" }}>
                Smart Living Radar
              </span>
            </div>

            {/* Brand anchor */}
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <EasyLocsLogo variant="full" size="sm" animate />
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>LIVE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight" style={{ color: "hsl(40 50% 97%)" }}>
              Everything{" "}
              <span className="text-gradient-gold">Around You</span>
              <br />
              <span className="text-lg sm:text-xl font-bold" style={{ color: "hsl(220 15% 55%)" }}>
                Live discovery. Real-time availability.
              </span>
            </h2>

            {/* Glass cards */}
            <div className="space-y-2">
              {NEARBY_ITEMS.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl border backdrop-blur-lg group cursor-default"
                  style={{ background: "hsl(220 40% 8% / 0.5)", borderColor: "hsl(220 15% 90% / 0.06)" }}
                >
                  <span className="text-xl shrink-0 w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: `${item.color}15` }}>
                    {item.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: "hsl(40 50% 94%)" }}>{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "hsl(220 15% 45%)" }}>
                      <span className="flex items-center gap-0.5"><Locate className="h-2.5 w-2.5" />{item.dist}</span>
                      {item.rating && <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />{item.rating}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{item.eta}</span>
                    </div>
                  </div>
                  <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                </motion.div>
              ))}
            </div>

            <Link
              to="/radar"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "var(--gradient-gold, linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.7)))", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 30px hsl(var(--accent) / 0.2)" }}
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
