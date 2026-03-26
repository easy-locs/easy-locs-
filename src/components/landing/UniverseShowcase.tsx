/**
 * UniverseShowcase — Premium section below hero showing all 9 universes.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed, ShoppingCart, Wrench, Car, Send,
  Plane, Building2, Wallet, MessageCircle, ArrowRight,
} from "lucide-react";

const SECTIONS = [
  { icon: UtensilsCrossed, title: "Food", desc: "Restaurants & delivery", to: "/food", accent: "hsl(15 80% 55%)" },
  { icon: ShoppingCart, title: "Grocery", desc: "Fresh groceries fast", to: "/grocery", accent: "hsl(142 60% 45%)" },
  { icon: Wrench, title: "Services", desc: "Local professionals", to: "/services-hub", accent: "hsl(220 70% 55%)" },
  { icon: Car, title: "Ride", desc: "Taxi & VTC", to: "/mobility/taxi", accent: "hsl(270 60% 55%)" },
  { icon: Send, title: "Send", desc: "Parcels & courier", to: "/send", accent: "hsl(190 70% 45%)" },
  { icon: Plane, title: "Travel", desc: "Flights & stays", to: "/travel", accent: "hsl(250 65% 55%)" },
  { icon: Building2, title: "Property", desc: "Rent & buy/sell", to: "/property-hub", accent: "hsl(38 65% 50%)" },
  { icon: Wallet, title: "Wallet", desc: "Payments & transfers", to: "/wallet", accent: "hsl(152 60% 42%)" },
  { icon: MessageCircle, title: "Messages", desc: "Chat & calls", to: "/dashboard/messages", accent: "hsl(210 80% 52%)" },
];

export default function UniverseShowcase() {
  return (
    <section className="py-14 sm:py-18 lg:py-22 bg-background" aria-label="Universes">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-8 lg:mb-12"
        >
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground">
            9 Universes. One Platform.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            From ordering food to managing property — everything in a single ecosystem.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.03, duration: 0.35 }}
            >
              <Link
                to={s.to}
                className="group flex flex-col gap-2.5 p-3 sm:p-4 lg:p-5 rounded-2xl border border-border/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border/50"
                style={{ background: `linear-gradient(135deg, ${s.accent}08, ${s.accent}03)` }}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}15` }}>
                  <s.icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" style={{ color: s.accent }} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
                    {s.title}
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-[10px] sm:text-2xs text-muted-foreground mt-0.5 line-clamp-1">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
