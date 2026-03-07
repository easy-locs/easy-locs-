import { motion } from "framer-motion";
import { Globe, Languages, Banknote, FileCheck, Cpu, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const advantages = [
  { icon: Globe, title: "Worldwide Coverage", desc: "Manage properties in 110+ countries with country-specific regulations, taxes, and legal templates.", color: "info" },
  { icon: Languages, title: "31 Languages", desc: "Interface, documents, and tenant communication auto-translated. Your tenants see everything in their own language.", color: "accent" },
  { icon: Banknote, title: "Multi-Currency", desc: "Collect rent and payments in any currency. Auto-detect based on property location and tenant preference.", color: "success" },
  { icon: FileCheck, title: "Smart Documents", desc: "Auto-generate leases, receipts, payment notices, dunning letters, and fiscal reports per country.", color: "warning" },
  { icon: Cpu, title: "AI Automation", desc: "AI assistant for document drafting, rent optimization, tenant replies, and performance analysis.", color: "info" },
  { icon: ShieldCheck, title: "Security & Compliance", desc: "GDPR-ready, MFA support, encrypted storage, audit trail, and role-based access for your team.", color: "destructive" },
];

const AdvantagesSection = () => {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden bg-navy-deep">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--accent) / 0.4) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--accent) / 0.4) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.06) 0%, transparent 60%)' }}
      />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4 px-4 py-1.5 rounded-full border border-accent/25"
            style={{ color: 'hsl(var(--gold-light))', background: 'hsl(var(--accent) / 0.1)' }}
          >
            Why Easy-Locs
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: 'hsl(var(--primary-foreground))' }}>
            Why Professionals Choose{" "}
            <span className="text-gradient-gold">Easy-Locs</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: 'hsl(var(--primary-foreground) / 0.5)' }}>
            Built for scale, designed for simplicity, optimized for every market.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {advantages.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group rounded-2xl p-6 border transition-all duration-300 relative overflow-hidden"
              style={{
                borderColor: 'hsl(var(--primary-foreground) / 0.06)',
                background: 'hsl(var(--primary-foreground) / 0.03)',
              }}
            >
              {/* Top glow bar on hover */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${a.color})), transparent)` }}
              />
              <div
                className="absolute top-0 left-0 right-0 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at top, hsl(var(--${a.color}) / 0.08) 0%, transparent 70%)` }}
              />

              <div className="relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `hsl(var(--${a.color}) / 0.12)` }}
                >
                  <a.icon className="h-5 w-5" style={{ color: `hsl(var(--${a.color}))` }} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: 'hsl(var(--primary-foreground))' }}>{a.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--primary-foreground) / 0.45)' }}>{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            to="/signup"
            className="group inline-flex items-center gap-2.5 bg-gradient-gold text-accent-foreground font-bold px-10 py-4 rounded-2xl transition-all text-base relative overflow-hidden"
            style={{ boxShadow: '0 0 40px hsl(var(--accent) / 0.3)' }}
          >
            <span className="relative z-10 flex items-center gap-2.5">
              Get Started Free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default AdvantagesSection;
