import { motion } from "framer-motion";
import { Globe, Languages, Banknote, FileCheck, Cpu, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const advantages = [
  { icon: Globe, title: "Worldwide Coverage", desc: "Manage properties in 110+ countries with country-specific regulations, taxes, and legal templates.", color: "bg-info/12 text-info" },
  { icon: Languages, title: "31 Languages", desc: "Interface, documents, and tenant communication auto-translated. Your tenants see everything in their own language.", color: "bg-accent/12 text-accent" },
  { icon: Banknote, title: "Multi-Currency", desc: "Collect rent and payments in any currency. Auto-detect based on property location and tenant preference.", color: "bg-success/12 text-success" },
  { icon: FileCheck, title: "Smart Documents", desc: "Auto-generate leases, receipts, payment notices, dunning letters, and fiscal reports per country.", color: "bg-warning/12 text-warning" },
  { icon: Cpu, title: "AI Automation", desc: "AI assistant for document drafting, rent optimization, tenant replies, and performance analysis.", color: "bg-info/12 text-info" },
  { icon: ShieldCheck, title: "Security & Compliance", desc: "GDPR-ready, MFA support, encrypted storage, audit trail, and role-based access for your team.", color: "bg-destructive/12 text-destructive" },
];

const AdvantagesSection = () => {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" style={{ background: 'hsl(var(--navy-deep))' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[200px]" />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>
            Why Professionals Choose{" "}
            <span className="text-gradient-gold">Easy-Locs</span>
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'hsl(var(--primary-foreground) / 0.5)' }}>
            Built for scale, designed for simplicity, optimized for every market.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {advantages.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl p-6 border border-primary-foreground/8 bg-primary-foreground/[0.03] hover:bg-primary-foreground/[0.06] transition-colors"
            >
              <div className={`w-11 h-11 rounded-lg ${a.color.split(' ')[0]} flex items-center justify-center mb-4`}>
                <a.icon className={`h-5 w-5 ${a.color.split(' ')[1]}`} />
              </div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--primary-foreground))' }}>{a.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--primary-foreground) / 0.45)' }}>{a.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-bold px-8 py-3.5 rounded-xl shadow-gold hover:opacity-90 transition-all text-sm"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default AdvantagesSection;
