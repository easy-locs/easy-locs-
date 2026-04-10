import { memo } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const E2EEBadge = memo(function E2EEBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full"
        style={{
          background: "hsl(152 60% 42% / 0.1)",
          border: "1px solid hsl(152 60% 42% / 0.15)",
        }}
      >
        <ShieldCheck className="w-3 h-3" style={{ color: "hsl(152 60% 42%)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(152 60% 42%)" }}>
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
        background: "hsl(152 60% 42% / 0.08)",
        border: "1px solid hsl(152 60% 42% / 0.12)",
      }}
    >
      <ShieldCheck className="w-3.5 h-3.5" style={{ color: "hsl(152 60% 42%)" }} />
      <span className="text-[10px] font-bold" style={{ color: "hsl(152 60% 42%)" }}>
        {t("dashboard.security_badge")}
      </span>
      <motion.span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: "hsl(152 60% 42%)" }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
});

export default E2EEBadge;
