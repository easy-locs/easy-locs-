import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, X } from "lucide-react";
import { isAdhanPlaying, stopAdhan, getCurrentAdhanInfo } from "@/lib/adhan-audio";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

export function AdhanMiniPlayer() {
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState<{ prayerName?: string; muezzinName?: string }>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const playing = isAdhanPlaying();
      setVisible(playing);
      if (playing) {
        setInfo(getCurrentAdhanInfo());
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleStop = useCallback(() => {
    stopAdhan();
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 rounded-2xl shadow-2xl flex items-center gap-3 px-4 py-3"
          style={{ background: NAVY, border: `1px solid ${GOLD}33` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${GOLD}20` }}
          >
            <Volume2 size={20} style={{ color: GOLD }} className="animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: GOLD }}>
              {info.prayerName ? `Adhan — ${info.prayerName}` : "Adhan en cours"}
            </p>
            {info.muezzinName && (
              <p className="text-[0.6875rem] truncate" style={{ color: `${GOLD}88` }}>
                {info.muezzinName}
              </p>
            )}
          </div>

          <button
            onClick={handleStop}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${GOLD}15` }}
            aria-label="Arrêter l'Adhan"
          >
            <X size={18} style={{ color: GOLD }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
