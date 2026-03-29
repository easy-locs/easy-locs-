/**
 * ChatEmptyState — Clean WhatsApp-style empty state.
 */
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  t: (key: string) => string;
}

export default function ChatEmptyState({ t }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-xs px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: "hsl(var(--muted))" }}>
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>
          {t("orbit.empty_title") || "Select a conversation"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("orbit.empty_subtitle") || "Choose from your existing conversations or start a new one."}
        </p>
      </motion.div>
    </div>
  );
}
