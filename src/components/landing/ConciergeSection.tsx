import { motion } from "framer-motion";
import { ConciergeBell, CalendarRange, CreditCard, Camera, Share2, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: ConciergeBell, title: "Service Catalog", desc: "Create and manage cleaning, transfers, activities, spa, equipment rental and any custom service." },
  { icon: CalendarRange, title: "Booking Calendar", desc: "Guests pick a date, time slot and quantity. Availability is managed automatically per service." },
  { icon: CreditCard, title: "Instant Payment", desc: "Collect payments via Stripe, bank transfer, or payment links. Track status in real time." },
  { icon: Camera, title: "Professional Photos", desc: "Upload multiple photos per service for a polished public showcase that converts visitors into clients." },
  { icon: Share2, title: "Shareable Showcase", desc: "Send a public link via WhatsApp, email or copy-paste. Your services are always one click away." },
  { icon: ShieldCheck, title: "Document Collection", desc: "Collect passport, ID and visa photos directly inside each booking for compliance and verification." },
];

const ConciergeSection = () => {
  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-6">
              <ConciergeBell className="h-4 w-4" />
              Concierge & Services
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Turn Every Stay Into a <span className="text-gradient-gold">Revenue Opportunity</span>
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              Offer professional concierge services alongside your short-term rentals. From airport transfers to spa bookings — manage everything, collect payments instantly, and track the full lifecycle of every reservation.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:gap-3 transition-all"
            >
              Start selling services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border/50 rounded-xl p-5 hover:border-accent/25 hover:shadow-card-hover transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <f.icon className="h-4.5 w-4.5 text-accent" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConciergeSection;
