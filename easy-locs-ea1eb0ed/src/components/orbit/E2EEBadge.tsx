import { memo } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GOLD = "hsl(var(--accent))";

const E2EEBadge = memo(function E2EEBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{
          background: "hsl(var(--accent) / 0.1)",
          border: "1px solid hsl(var(--accent) / 0.15)",
        }}
      >
        <ShieldCheck className="w-3 h-3" style={{ color: GOLD }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>
          E2EE
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
      style={{
        background: "linear-gradient(135deg, hsl(225 22% 16% / 0.08), hsl(var(--accent) / 0.08))",
        border: "1px solid hsl(var(--accent) / 0.12)",
      }}
    >
      <ShieldCheck className="w-3.5 h-3.5" style={{ color: GOLD }} />
      <span className="text-[10px] font-bold" style={{ color: GOLD }}>
        {t("dashboard.security_badge")}
      </span>
      <motion.span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: GOLD }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
});

export default E2EEBadge;
