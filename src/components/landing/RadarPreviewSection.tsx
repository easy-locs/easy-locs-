/**
 * RadarPreviewSection — CTA to explore the live radar/map.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Navigation, Radio } from "lucide-react";

export default function RadarPreviewSection() {
  return (
    <section className="py-10 sm:py-16" aria-label="Live Radar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <Link
            to="/radar"
            className="group block relative rounded-3xl overflow-hidden border border-border/20 hover:border-accent/40 transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, hsl(220 50% 8%) 0%, hsl(230 45% 14%) 50%, hsl(250 40% 10%) 100%)",
            }}
          >
            <div className="relative z-10 p-6 sm:p-10 lg:p-14 flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
              {/* Left content */}
              <div className="flex-1 text-center lg:text-left space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/20 bg-accent/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                  <span className="text-[11px] font-bold text-accent">Live Radar</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold" style={{ color: "hsl(40 50% 95%)" }}>
                  Discover Everything <br className="hidden sm:block" />
                  <span className="text-accent">Around You</span>
                </h2>

                <p className="text-sm sm:text-base" style={{ color: "hsl(220 15% 55%)" }}>
                  Restaurants, services, properties, rides — all on a live interactive map with real-time availability.
                </p>

                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white group-hover:gap-3 transition-all" style={{ background: "var(--gradient-gold)" }}>
                  <Navigation className="h-4 w-4" />
                  Open Radar
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>

              {/* Right visual */}
              <div className="relative w-full max-w-xs lg:max-w-sm">
                <div className="aspect-square rounded-full border-2 border-accent/10 flex items-center justify-center relative">
                  {/* Radar rings */}
                  {[1, 2, 3].map((ring) => (
                    <motion.div
                      key={ring}
                      className="absolute rounded-full border border-accent/10"
                      style={{
                        width: `${ring * 33}%`,
                        height: `${ring * 33}%`,
                      }}
                      animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, delay: ring * 0.5 }}
                    />
                  ))}

                  {/* Center dot */}
                  <div className="w-4 h-4 rounded-full bg-accent shadow-lg shadow-accent/30 z-10" />

                  {/* Scatter dots */}
                  {[
                    { top: "15%", left: "60%", color: "hsl(15 80% 55%)" },
                    { top: "30%", left: "20%", color: "hsl(142 60% 45%)" },
                    { top: "65%", left: "75%", color: "hsl(250 65% 55%)" },
                    { top: "70%", left: "30%", color: "hsl(38 65% 50%)" },
                    { top: "45%", left: "80%", color: "hsl(220 70% 55%)" },
                  ].map((dot, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 rounded-full"
                      style={{ top: dot.top, left: dot.left, background: dot.color, boxShadow: `0 0 8px ${dot.color}` }}
                      animate={{ scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Background glow */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at 70% 40%, hsl(var(--accent) / 0.3), transparent 60%)" }} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
