import { motion } from "framer-motion";
import { ConciergeBell, CalendarRange, CreditCard, Camera, Share2, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: ConciergeBell, title: "Service Catalog", desc: "Create and manage cleaning, transfers, activities and custom services.", color: "accent" },
  { icon: CalendarRange, title: "Booking Calendar", desc: "Guests pick date, time slot and quantity. Availability managed automatically.", color: "info" },
  { icon: CreditCard, title: "Instant Payment", desc: "Collect via Stripe, bank transfer, or payment links. Track in real time.", color: "success" },
  { icon: Camera, title: "Professional Photos", desc: "Upload photos per service for a polished showcase that converts visitors.", color: "warning" },
  { icon: Share2, title: "Shareable Showcase", desc: "Send a public link via WhatsApp, email. Services are one click away.", color: "info" },
  { icon: ShieldCheck, title: "Document Collection", desc: "Collect passport, ID and visa photos inside each booking.", color: "accent" },
];

const ConciergeSection = () => (
  <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
    <div className="container max-w-6xl relative z-10">
      <div className="grid lg:grid-cols-2 gap-14 items-center">
        {/* Left text */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5">
            <ConciergeBell className="h-3.5 w-3.5" />
            Concierge & Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            Turn Every Stay Into a{" "}
            <span className="text-gradient-gold">Revenue Opportunity</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg">
            Offer professional concierge services alongside short-term rentals. Manage everything and collect payments instantly.
          </p>
          <Link
            to="/signup"
            className="group inline-flex items-center gap-2 text-sm font-bold text-accent hover:gap-3 transition-all"
          >
            Start selling services
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Right cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group bg-card border border-border/50 rounded-2xl p-5 hover:border-accent/25 transition-all duration-300 relative overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color})), transparent)` }}
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

export default ConciergeSection;
