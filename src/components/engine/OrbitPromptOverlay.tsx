/**
 * OrbitPromptOverlay — Shows engagement prompts when chat activity is low.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { getBusinessEngineState } from "@/lib/engines/autonomous-business-engine";

export function OrbitPromptOverlay() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const s = getBusinessEngineState();
      if (s.orbitPrompts.length > 0) {
        setPrompt(s.orbitPrompts[0].message);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!prompt || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed bottom-36 right-4 z-50 max-w-[260px]"
      >
        <div
          className="rounded-2xl p-3.5 shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 8px 32px hsl(var(--foreground) / 0.1)",
          }}
          onClick={() => navigate("/orbit")}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground leading-tight">{prompt}</p>
              <p className="text-[10px] text-primary mt-1 font-medium">Tap to open Orbit →</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
