import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, QrCode, MessageCircle, BarChart3, Camera } from "lucide-react";

const gold = "hsl(var(--accent))";
const navy = "hsl(225 22% 16%)";

interface Props {
  merchantId: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function MeQuickActions({ merchantId }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const actions = [
    { icon: ShoppingBag, label: t("me.qa_orders"), path: "/merchant/orders", color: "hsl(210 80% 52%)" },
    { icon: Plus, label: t("me.qa_add_product"), path: `/merchant/menu/${merchantId}`, color: gold },
    { icon: QrCode, label: t("me.qa_pos"), path: "/pos", color: "hsl(152 60% 42%)" },
    { icon: MessageCircle, label: t("me.qa_chat"), path: "/orbit", color: "hsl(270 60% 55%)" },
    { icon: BarChart3, label: t("me.qa_analytics"), path: "/seller", color: "hsl(190 75% 46%)" },
    { icon: Camera, label: t("me.qa_media"), path: `/merchant/store-settings/${merchantId}`, color: "hsl(350 65% 55%)" },
  ];

  const go = useCallback((path: string) => navigate(path), [navigate]);

  return (
    <motion.div variants={fadeUp} className="grid grid-cols-6 gap-1.5">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => go(action.path)}
          className="flex flex-col items-center gap-1 py-2.5 rounded-2xl active:scale-[0.95] transition-transform"
          style={{ background: `${action.color}08` }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${action.color}14` }}
          >
            <action.icon className="w-4.5 h-4.5" style={{ color: action.color }} />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground leading-tight text-center line-clamp-2 break-words w-full px-0.5">
            {action.label}
          </span>
        </button>
      ))}
    </motion.div>
  );
}

export default memo(MeQuickActions);
