import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  shouldShowRatingPrompt,
  markPromptShown,
  markRated,
  markDismissed,
  markLater,
  getStoreUrl,
  incrementSession,
} from "@/lib/app-rating";
import { haptic } from "@/lib/haptics";

const AppRatingPrompt = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    incrementSession();
    const timer = setTimeout(() => {
      if (shouldShowRatingPrompt()) {
        setVisible(true);
        markPromptShown();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleRate = () => {
    haptic("success");
    markRated();
    setVisible(false);
    window.open(getStoreUrl(), "_blank", "noopener");
  };

  const handleLater = () => {
    haptic("light");
    markLater();
    setVisible(false);
  };

  const handleDismiss = () => {
    haptic("light");
    markDismissed();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={handleLater}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[91] bg-card rounded-t-2xl shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          >
            <button
              onClick={handleLater}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
                <Star className="h-7 w-7 text-white fill-white" />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-1">
                Vous aimez Easy-Locs ?
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Votre avis nous aide à améliorer l'application. Prenez un moment pour nous noter !
              </p>

              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-8 w-8 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <div className="w-full space-y-2">
                <Button
                  onClick={handleRate}
                  className="w-full gap-2"
                  variant="premium"
                  size="lg"
                >
                  <ThumbsUp className="h-4 w-4" /> Noter l'application
                </Button>
                <button
                  onClick={handleLater}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Ne plus demander
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AppRatingPrompt;
