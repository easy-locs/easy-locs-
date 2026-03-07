import { motion } from "framer-motion";
import { BrainCircuit, FileText, MessageSquare, Bell, BarChart3, TrendingUp, Sparkles } from "lucide-react";

const capabilities = [
  { icon: FileText, label: "Generate documents", desc: "Leases, receipts, notices — auto-generated per country." },
  { icon: MessageSquare, label: "Answer tenant messages", desc: "Smart suggested replies with multilingual translation." },
  { icon: Bell, label: "Automate reminders", desc: "Payment due dates, lease renewals, maintenance schedules." },
  { icon: BarChart3, label: "Analyze performance", desc: "Occupancy rates, revenue tracking, vacancy insights." },
  { icon: TrendingUp, label: "Suggest rent optimization", desc: "Market-based pricing recommendations per region." },
];

const AISection = () => {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" style={{ background: 'hsl(var(--navy-deep))' }}>
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/6 blur-[180px]" />

      <div className="container max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-medium mb-6"
              style={{ color: 'hsl(var(--gold-light))' }}>
              <Sparkles className="h-4 w-4" />
              AI-Powered
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--primary-foreground))' }}>
              Your Intelligent <span className="text-gradient-gold">Property Assistant</span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'hsl(var(--primary-foreground) / 0.5)' }}>
              An AI copilot that helps landlords manage every aspect of their portfolio — from document generation to performance analysis.
            </p>

            <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className="h-8 w-8 text-accent" />
              <span className="text-lg font-semibold" style={{ color: 'hsl(var(--primary-foreground))' }}>Easy-Locs AI</span>
            </div>
          </motion.div>

          {/* Right capabilities */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 rounded-xl p-4 border border-primary-foreground/8 bg-primary-foreground/[0.03] hover:bg-primary-foreground/[0.06] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <cap.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5" style={{ color: 'hsl(var(--primary-foreground))' }}>{cap.label}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--primary-foreground) / 0.45)' }}>{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AISection;
