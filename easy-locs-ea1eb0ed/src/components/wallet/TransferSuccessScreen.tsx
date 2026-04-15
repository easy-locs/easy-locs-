import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatWalletAmount } from "@/lib/format";

interface TransferSuccessScreenProps {
  amount: string;
  currency: string;
  recipientName: string;
  onDone: () => void;
}

export default function TransferSuccessScreen({ amount, currency, recipientName, onDone }: TransferSuccessScreenProps) {
  const { t } = useI18n();

  const formatted = formatWalletAmount(Number(amount), currency);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8"
      style={{ background: "hsl(var(--background))" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{ background: "hsl(152 60% 42% / 0.12)" }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
        >
          <CheckCircle className="w-14 h-14" style={{ color: "hsl(152 60% 42%)" }} />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm font-bold uppercase tracking-widest mb-2"
        style={{ color: "hsl(152 60% 42%)" }}
      >
        {t("wallet.transferComplete")}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-extrabold text-foreground tracking-tight tabular-nums mb-2"
      >
        {formatted}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-muted-foreground mb-12"
      >
        {t("wallet.sentToName").replace("{name}", recipientName)}
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={onDone}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold transition-colors"
        style={{ background: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 72% 38%))", color: "hsl(228 28% 7%)", boxShadow: "0 4px 16px hsl(168 72% 44% / 0.2)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("wallet.backToWallet")}
      </motion.button>
    </motion.div>
  );
}
