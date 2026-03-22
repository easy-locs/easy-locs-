/**
 * UpdateNotification — Shows a non-intrusive banner when a new app version is available.
 * Provides a "Refresh" button to apply the update cleanly.
 */
import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_VERSION, startVersionPolling, forceCleanRefresh } from "@/lib/version-check";

export default function UpdateNotification() {
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // DISABLED — version polling was compounding the reload loop
  // useEffect(() => {
  //   const stop = startVersionPolling(() => setVisible(true));
  //   return stop;
  // }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await forceCleanRefresh();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-2 left-1/2 z-[9999] flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg"
        >
          <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            A new version is available
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {refreshing ? "Updating…" : "Refresh"}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
