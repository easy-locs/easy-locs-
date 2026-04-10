import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Plus, CreditCard, Star, Trash2, Shield } from "lucide-react";

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
};

const BRAND_COLORS: Record<string, { bg: string; accent: string }> = {
  Visa: { bg: "linear-gradient(135deg, hsl(220 80% 50%) 0%, hsl(220 70% 40%) 100%)", accent: "hsl(220 80% 50%)" },
  Mastercard: { bg: "linear-gradient(135deg, hsl(15 80% 50%) 0%, hsl(350 70% 45%) 100%)", accent: "hsl(15 80% 50%)" },
  Amex: { bg: "linear-gradient(135deg, hsl(210 60% 45%) 0%, hsl(210 50% 35%) 100%)", accent: "hsl(210 60% 45%)" },
};

const INITIAL_CARDS: SavedCard[] = [
  { id: "1", brand: "Visa", last4: "4242", expiry: "12/27", isDefault: true },
  { id: "2", brand: "Mastercard", last4: "8844", expiry: "08/28", isDefault: false },
];

export default function CustomerSavedCardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState(INITIAL_CARDS);

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    toast.success("Card removed");
  };

  const setDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    toast.success("Default card updated");
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Payment Methods</h1>
          <p className="text-xs text-muted-foreground">{cards.length} card{cards.length !== 1 ? "s" : ""} saved</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => toast.info("Card form will be connected via Stripe")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white active:scale-[0.97] transition-transform"
          style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 12px hsl(var(--primary) / 0.25)" }}
        >
          <Plus className="w-4 h-4" />
          Add New Card
        </motion.button>
      </div>

      <div className="px-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {cards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(210 80% 52% / 0.08)" }}>
                <CreditCard className="w-8 h-8" style={{ color: "hsl(210 80% 52%)" }} />
              </div>
              <p className="text-sm font-bold text-foreground">No saved cards</p>
              <p className="text-xs text-muted-foreground mt-1">Add a card to speed up checkout</p>
            </motion.div>
          ) : (
            cards.map((card, idx) => {
              const brandStyle = BRAND_COLORS[card.brand] ?? BRAND_COLORS.Visa;
              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05, duration: 0.25 }}
                >
                  <div
                    className="rounded-2xl p-5 relative overflow-hidden"
                    style={{ background: brandStyle.bg, minHeight: 160 }}
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />

                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-white/80" />
                        <span className="text-sm font-bold text-white/90">{card.brand}</span>
                      </div>
                      {card.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                          <Star className="w-2.5 h-2.5" /> Default
                        </span>
                      )}
                    </div>

                    <p className="text-xl font-mono font-bold text-white tracking-[0.2em] mb-4">
                      •••• •••• •••• {card.last4}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-white/50 uppercase font-semibold">Expires</p>
                        <p className="text-sm font-bold text-white">{card.expiry}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/50">
                        <Shield className="w-3 h-3" /> Encrypted
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {!card.isDefault && (
                      <button
                        onClick={() => setDefault(card.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold active:scale-95 transition-transform"
                        style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
                      >
                        <Star className="w-3 h-3" /> Set Default
                      </button>
                    )}
                    <button
                      onClick={() => removeCard(card.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold active:scale-95 transition-transform"
                      style={{ background: "hsl(var(--destructive) / 0.06)", color: "hsl(var(--destructive))" }}
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
