/**
 * UniverseShowcase — Premium desktop section below hero showing all universes.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed, ShoppingCart, Wrench, Car, Send,
  Plane, Building2, Wallet, MessageCircle, ArrowRight,
} from "lucide-react";

const SECTIONS = [
  { icon: UtensilsCrossed, title: "Food", desc: "Restaurants, cuisine, delivery", to: "/food", gradient: "linear-gradient(135deg, hsl(15 80% 55% / 0.1), hsl(15 80% 55% / 0.03))", accent: "hsl(15 80% 55%)" },
  { icon: ShoppingCart, title: "Grocery", desc: "Fresh groceries, supermarkets", to: "/grocery", gradient: "linear-gradient(135deg, hsl(142 60% 45% / 0.1), hsl(142 60% 45% / 0.03))", accent: "hsl(142 60% 45%)" },
  { icon: Wrench, title: "Services", desc: "Local professionals, bookings", to: "/services-hub", gradient: "linear-gradient(135deg, hsl(220 70% 55% / 0.1), hsl(220 70% 55% / 0.03))", accent: "hsl(220 70% 55%)" },
  { icon: Car, title: "Ride", desc: "Taxi, VTC, rides", to: "/ride", gradient: "linear-gradient(135deg, hsl(270 60% 55% / 0.1), hsl(270 60% 55% / 0.03))", accent: "hsl(270 60% 55%)" },
  { icon: Send, title: "Send", desc: "Parcels, courier, express", to: "/send", gradient: "linear-gradient(135deg, hsl(190 70% 45% / 0.1), hsl(190 70% 45% / 0.03))", accent: "hsl(190 70% 45%)" },
  { icon: Plane, title: "Travel", desc: "Flights, hotels, stays", to: "/travel", gradient: "linear-gradient(135deg, hsl(250 65% 55% / 0.1), hsl(250 65% 55% / 0.03))", accent: "hsl(250 65% 55%)" },
  { icon: Building2, title: "Property", desc: "Rent & buy/sell real estate", to: "/property-hub", gradient: "linear-gradient(135deg, hsl(38 65% 50% / 0.1), hsl(38 65% 50% / 0.03))", accent: "hsl(38 65% 50%)" },
  { icon: Wallet, title: "Wallet", desc: "Payments, transfers, cards", to: "/wallet", gradient: "linear-gradient(135deg, hsl(152 60% 42% / 0.1), hsl(152 60% 42% / 0.03))", accent: "hsl(152 60% 42%)" },
  { icon: MessageCircle, title: "Messages", desc: "Chat, calls, support", to: "/dashboard/messages", gradient: "linear-gradient(135deg, hsl(210 80% 52% / 0.1), hsl(210 80% 52% / 0.03))", accent: "hsl(210 80% 52%)" },
];

export default function UniverseShowcase() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-10 lg:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground">
            9 Universes. One Platform.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
            Everything you need — from ordering food to managing property — in a single premium ecosystem.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
            >
              <Link
                to={s.to}
                className="group flex flex-col gap-3 p-4 sm:p-5 lg:p-6 rounded-2xl border border-border/40 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: s.gradient }}
              >
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.accent}20` }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.accent }} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                    {s.title}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
