import { motion } from "framer-motion";
import { ConciergeBell, CalendarRange, CreditCard, Camera, Share2, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: ConciergeBell, title: "Service Catalog", desc: "Create and manage cleaning, transfers, activities, spa, equipment rental and any custom service.", color: "accent" },
  { icon: CalendarRange, title: "Booking Calendar", desc: "Guests pick a date, time slot and quantity. Availability is managed automatically per service.", color: "info" },
  { icon: CreditCard, title: "Instant Payment", desc: "Collect payments via Stripe, bank transfer, or payment links. Track status in real time.", color: "success" },
  { icon: Camera, title: "Professional Photos", desc: "Upload multiple photos per service for a polished public showcase that converts visitors into clients.", color: "warning" },
  { icon: Share2, title: "Shareable Showcase", desc: "Send a public link via WhatsApp, email or copy-paste. Your services are always one click away.", color: "info" },
  { icon: ShieldCheck, title: "Document Collection", desc: "Collect passport, ID and visa photos directly inside each booking for compliance and verification.", color: "accent" },
];

const ConciergeSection = () => {
  return (
    <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px]"
        style={{ background: 'hsl(var(--accent) / 0.03)' }}
      />

      <div className="container max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5"
            >
              <ConciergeBell className="h-3.5 w-3.5" />
              Concierge & Services
            </motion.span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-5">
              Turn Every Stay Into a{" "}
              <span className="text-gradient-gold">Revenue Opportunity</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-10">
              Offer professional concierge services alongside your short-term rentals. From airport transfers to spa bookings — manage everything, collect payments instantly, and track the full lifecycle of every reservation.
            </p>
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2.5 text-sm font-bold text-accent hover:gap-3.5 transition-all"
            >
              Start selling services
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group bg-card border border-border/50 rounded-2xl p-5 hover:border-accent/25 transition-all duration-300 relative overflow-hidden"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 30% 0%, hsl(var(--${f.color}) / 0.06) 0%, transparent 60%)` }}
                />
                <div className="relative z-10">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `hsl(var(--${f.color}) / 0.1)` }}
                  >
                    <f.icon className="h-4 w-4" style={{ color: `hsl(var(--${f.color}))` }} />
                  </div>
                  <h4 className="font-bold text-foreground text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConciergeSection;
