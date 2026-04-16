import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { listHomePromos } from "@/lib/promo/promoEngine";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { Sparkles, ArrowRight, Tag, Clock } from "lucide-react";

const ACCENT_PALETTE = [
  "hsl(15 80% 55%)",
  "hsl(200 70% 50%)",
  "hsl(270 60% 55%)",
  "hsl(var(--accent))",
  "hsl(150 60% 40%)",
  "hsl(340 70% 55%)",
  "hsl(220 70% 55%)",
  "hsl(50 80% 50%)",
];

export default function HomePromoCarousel() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["home-promos"],
    queryFn: () => listHomePromos(8),
    staleTime: 10000,
  });

  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
          <Sparkles className="w-3.5 h-3.5 text-accent" />
        </div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">
          Active Promotions
        </p>
      </div>

      {isLoading && (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="min-w-[280px] rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted) / 0.3)", height: 180 }} />
          ))}
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {rows.map((row: any, idx: number) => {
            const accent = ACCENT_PALETTE[idx % ACCENT_PALETTE.length];
            const discountLabel = row.discount_type === "percent"
              ? `${Number(row.discount_value ?? 0)}% OFF`
              : `${formatMoneyByCountry(Number(row.discount_value ?? 0), row.seed_merchants?.country || "AE")} OFF`;

            return (
              <motion.button
                key={row.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                onClick={() => navigate(`/s/${row.merchant_id}`)}
                className="min-w-[280px] snap-start rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-all duration-200 relative group"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border) / 0.15)",
                  boxShadow: "0 4px 20px hsl(0 0% 0% / 0.08)",
                }}
              >
                <div className="h-28 w-full relative overflow-hidden">
                  {row.seed_merchants?.cover_image ? (
                    <img
                      src={row.seed_merchants.cover_image}
                      alt={row.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}40 0%, ${accent}20 100%)` }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  <span
                    className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase text-white backdrop-blur-md"
                    style={{ background: `${accent}cc`, border: `1px solid ${accent}50` }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {discountLabel}
                  </span>

                  {row.ends_at && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold text-white/90 backdrop-blur-md" style={{ background: "hsl(0 0% 0% / 0.4)" }}>
                      <Clock className="w-2.5 h-2.5" />
                      Limited
                    </span>
                  )}

                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${accent}90` }}>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                <div className="p-3 space-y-1.5">
                  <p className="text-sm font-bold text-foreground line-clamp-1">{row.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[0.6875rem] text-muted-foreground line-clamp-1">
                      {row.seed_merchants?.name}
                    </p>
                    {row.minimum_order_amount > 0 && (
                      <span className="text-[0.625rem] text-muted-foreground shrink-0">
                        Min {formatMoneyByCountry(Number(row.minimum_order_amount ?? 0), row.seed_merchants?.country || "AE")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5 }} />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
