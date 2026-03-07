import { motion } from "framer-motion";
import { BrainCircuit, FileText, MessageSquare, Bell, BarChart3, TrendingUp, Sparkles } from "lucide-react";

const capabilities = [
  { icon: FileText, label: "Generate documents", desc: "Leases, receipts, notices — auto-generated per country.", color: "accent" },
  { icon: MessageSquare, label: "Answer tenant messages", desc: "Smart suggested replies with multilingual translation.", color: "info" },
  { icon: Bell, label: "Automate reminders", desc: "Payment dates, lease renewals, maintenance schedules.", color: "warning" },
  { icon: BarChart3, label: "Analyze performance", desc: "Occupancy rates, revenue tracking, vacancy insights.", color: "success" },
  { icon: TrendingUp, label: "Optimize pricing", desc: "Market-based pricing recommendations per region.", color: "accent" },
];

const AISection = () => (
  <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
    <div className="absolute inset-0 opacity-[0.02]" style={{
      backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--accent)) 1px, transparent 0)`,
      backgroundSize: "32px 32px",
    }} />
    <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px] pointer-events-none" />

    <div className="container max-w-6xl relative z-10">
      <div className="grid lg:grid-cols-2 gap-14 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
            style={{ color: "hsl(var(--gold-light))", background: "hsl(var(--accent) / 0.1)", borderColor: "hsl(var(--accent) / 0.25)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" style={{ color: "hsl(var(--primary-foreground))" }}>
            Your Intelligent{" "}
            <span className="text-gradient-gold">Property Assistant</span>
          </h2>
          <p className="text-base sm:text-lg leading-relaxed max-w-lg" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
            An AI copilot that helps landlords manage every aspect — from document generation to performance analysis.
          </p>

          <div
            className="flex items-center gap-4 p-4 rounded-xl border"
            style={{ borderColor: "hsl(var(--accent) / 0.15)", background: "hsl(var(--accent) / 0.06)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--accent) / 0.15)" }}
            >
              <BrainCircuit className="h-5 w-5 text-accent" />
            </div>
            <div>
              <span className="text-sm font-bold" style={{ color: "hsl(var(--primary-foreground))" }}>Easy-Locs AI</span>
              <p className="text-xs" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>Powered by advanced language models</p>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ x: 4 }}
              className="group flex items-start gap-4 rounded-xl p-4 border transition-all duration-300 relative overflow-hidden"
              style={{ borderColor: "hsl(var(--primary-foreground) / 0.06)", background: "hsl(var(--primary-foreground) / 0.03)" }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `hsl(var(--${cap.color}))` }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `hsl(var(--${cap.color}) / 0.12)` }}
              >
                <cap.icon className="h-4 w-4" style={{ color: `hsl(var(--${cap.color}))` }} />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-0.5" style={{ color: "hsl(var(--primary-foreground))" }}>{cap.label}</h4>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--primary-foreground) / 0.45)" }}>{cap.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default AISection;
