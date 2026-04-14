import { useNavigate } from "react-router-dom";
import { Car, Package, ArrowLeft, Bike, Truck, Gift, ClipboardList, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import PremiumVerticalHero from "@/components/discovery/PremiumVerticalHero";
import { getVerticalTheme } from "@/lib/discovery/vertical-themes";
import { useUiEngine } from "@/hooks/useUiEngine";

const MOBILITY_SECTIONS = [
  {
    title: "Ride",
    items: [
      { label: "Taxi", desc: "Get a ride now or schedule", icon: Car, path: "/mobility/taxi", accent: "38 65% 56%" },
    ],
  },
  {
    title: "Send",
    items: [
      { label: "Delivery", desc: "Send a package anywhere", icon: Package, path: "/mobility/delivery", accent: "198 55% 42%" },
      { label: "Bring Me", desc: "Someone picks up for you", icon: Bike, path: "/mobility/delivery/bring", accent: "155 60% 38%" },
      { label: "Parcel", desc: "Door-to-door parcel delivery", icon: Truck, path: "/mobility/delivery/parcel", accent: "258 48% 42%" },
      { label: "Gift", desc: "Send a gift to someone", icon: Gift, path: "/mobility/delivery/gift", accent: "352 62% 48%" },
      { label: "Errand", desc: "We run your errands", icon: ClipboardList, path: "/mobility/delivery/errand", accent: "20 85% 48%" },
    ],
  },
];

export default function MobilityHubPage() {
  useUiEngine("mobility-mobilityhubpage");
  const navigate = useNavigate();
  const theme = getVerticalTheme("mobility");

  return (
    <div className="min-h-[100dvh] bg-background pb-[120px]">
      <PremiumVerticalHero
        title="Mobility"
        tagline="Ride, send & deliver — 0% fees"
        emoji="🚗"
        theme={theme}
      />

      <div className="px-4 mt-6 space-y-6">
        {MOBILITY_SECTIONS.map((section, si) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.1 }}
          >
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              {section.title === "Ride" ? <Car className="h-4 w-4 text-primary" /> : <Package className="h-4 w-4 text-primary" />}
              {section.title}
            </h2>
            <div className="space-y-2.5">
              {section.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/15 bg-card active:scale-[0.97] transition-transform text-left shadow-sm"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: si * 0.1 + i * 0.05 }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `hsl(${item.accent} / 0.12)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: `hsl(${item.accent})` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
