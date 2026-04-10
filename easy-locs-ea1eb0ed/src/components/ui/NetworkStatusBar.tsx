import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useI18n } from "@/lib/i18n";

export function NetworkStatusBar() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { t } = useI18n();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[9999] overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold"
            style={{ background: "hsl(0 72% 51%)", color: "#fff" }}
          >
            <WifiOff className="w-3.5 h-3.5" />
            {t("network.offline")}
          </div>
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          key="reconnected"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[9999] overflow-hidden"
        >
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold"
            style={{ background: "hsl(152 60% 42%)", color: "#fff" }}
          >
            <Wifi className="w-3.5 h-3.5" />
            {t("network.back_online")}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
