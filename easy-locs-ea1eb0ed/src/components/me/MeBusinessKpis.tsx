import { memo } from "react";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Eye, MessageCircle, ShoppingBag, Star, TrendingUp } from "lucide-react";

interface Props {
  views: number;
  contacts: number;
  orders: number;
  rating: number;
  revenue: number;
  currency: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function MeBusinessKpis({ views, contacts, orders, rating, revenue, currency }: Props) {
  const { t } = useI18n();

  const kpis = [
    { icon: Eye, value: views >= 1000 ? `${(views / 1000).toFixed(1)}k` : String(views), label: t("me.kpi_views"), color: "hsl(210 80% 52%)" },
    { icon: MessageCircle, value: String(contacts), label: t("me.kpi_contacts"), color: "hsl(152 60% 42%)" },
    { icon: ShoppingBag, value: String(orders), label: t("me.kpi_orders"), color: "hsl(38 65% 56%)" },
    { icon: Star, value: rating > 0 ? rating.toFixed(1) : "—", label: t("me.kpi_rating"), color: "hsl(38 92% 50%)" },
    { icon: TrendingUp, value: revenue >= 1000 ? `${(revenue / 1000).toFixed(0)}k` : String(revenue.toFixed(0)), label: t("me.kpi_revenue"), color: "hsl(270 60% 55%)" },
  ];

  return (
    <motion.div variants={fadeUp} className="grid grid-cols-5 gap-1.5">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="app-stat-chip text-center py-2.5 px-1"
          style={{ background: kpi.color.replace(")", " / 0.04)"), borderColor: kpi.color.replace(")", " / 0.08)") }}
        >
          <kpi.icon className="w-4 h-4 mx-auto mb-1" style={{ color: kpi.color }} />
          <p className="text-sm font-bold text-foreground leading-none">{kpi.value}</p>
          <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5 truncate">{kpi.label}</p>
        </div>
      ))}
    </motion.div>
  );
}

export default memo(MeBusinessKpis);
