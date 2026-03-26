/**
 * EngineActiveBanner — Visible product-level surface for AI engine decisions.
 * Shows wallet incentives, event campaigns, orbit prompts, and marketplace suggestions.
 * Rendered on the home page to prove engine decisions have real UI impact.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, MessageCircle, Zap, ShoppingBag, Sparkles } from "lucide-react";
import { getBusinessEngineState, type BusinessEngineState } from "@/lib/engines/autonomous-business-engine";

export default function EngineActiveBanner() {
  const navigate = useNavigate();
  const [state, setState] = useState<BusinessEngineState | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Poll engine state
    const check = () => {
      const s = getBusinessEngineState();
      if (s.lastRunAt) setState(s);
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  if (!state || !state.lastRunAt) return null;

  const dismiss = (id: string) => setDismissed(prev => new Set(prev).add(id));

  const campaigns = state.activeCampaigns.filter(c => !dismissed.has(c.id));
  const incentives = state.walletIncentives.filter(w => !dismissed.has(w.id));
  const prompts = state.orbitPrompts.filter(p => !dismissed.has(p.id));
  const flags = state.marketplaceFlags.filter(f => !dismissed.has(f.id));

  const hasContent = campaigns.length > 0 || incentives.length > 0 || prompts.length > 0 || flags.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-2.5">
      <AnimatePresence mode="popLayout">
        {/* Event campaigns */}
        {campaigns.map(c => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: c.bannerGradient }}
          >
            <button onClick={() => dismiss(c.id)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{c.emoji}</span>
              <div>
                <p className="text-sm font-bold text-white">{c.eventName}</p>
                <p className="text-[11px] text-white/70">Special offers active · {c.country}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/food")}
              className="mt-3 px-4 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm active:scale-95 transition-transform"
            >
              Explore deals →
            </button>
          </motion.div>
        ))}

        {/* Wallet incentives */}
        {incentives.length > 0 && (
          <motion.button
            key="wallet-incentive"
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => navigate("/wallet/hub")}
            className="w-full rounded-2xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))",
              border: "1px solid hsl(var(--primary) / 0.12)",
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{incentives[0].title}</p>
              <p className="text-[11px] text-muted-foreground">{incentives[0].description}</p>
            </div>
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
          </motion.button>
        )}

        {/* Orbit prompts */}
        {prompts.length > 0 && (
          <motion.button
            key="orbit-prompt"
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => navigate("/orbit")}
            className="w-full rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left bg-card"
            style={{ border: "1px solid hsl(var(--border) / 0.1)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{prompts[0].message}</p>
            </div>
          </motion.button>
        )}

        {/* Marketplace improvement suggestions */}
        {flags.length > 0 && (
          <motion.div
            key="mkt-flags"
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-3 space-y-1.5 bg-card"
            style={{ border: "1px solid hsl(var(--border) / 0.1)" }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-bold text-foreground">Improve your listings</p>
            </div>
            {flags.slice(0, 2).map(f => (
              <p key={f.id} className="text-[11px] text-muted-foreground pl-6">• {f.suggestion}</p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
