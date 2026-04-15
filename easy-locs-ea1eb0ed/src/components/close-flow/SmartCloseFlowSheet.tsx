/**
 * SmartCloseFlowSheet — Unified post-completion UI overlay.
 * Shows rating prompt → summary → auto-navigates back.
 * Renders globally in App.tsx.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloseFlowStore, type CloseFlowDomain } from "@/lib/close-flow/close-flow-engine";
import { haptic } from "@/lib/haptics";

const DOMAIN_LABELS: Record<CloseFlowDomain, { emoji: string; title: string; rateLabel: string }> = {
  ride: { emoji: "🚕", title: "Ride Complete", rateLabel: "Rate your driver" },
  order: { emoji: "📦", title: "Order Delivered", rateLabel: "Rate your order" },
  delivery: { emoji: "🛵", title: "Delivery Complete", rateLabel: "Rate the delivery" },
  booking: { emoji: "✅", title: "Booking Done", rateLabel: "Rate the experience" },
  orbit: { emoji: "💬", title: "Chat Closed", rateLabel: "Rate the conversation" },
  hotel: { emoji: "🏨", title: "Stay Complete", rateLabel: "Rate the hotel" },
};

export default function SmartCloseFlowSheet() {
  const navigate = useNavigate();
  const active = useCloseFlowStore((s) => s.active);
  const advance = useCloseFlowStore((s) => s.advance);
  const complete = useCloseFlowStore((s) => s.complete);
  const dismiss = useCloseFlowStore((s) => s.dismiss);

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reciprocalRating, setReciprocalRating] = useState(0);
  const [reciprocalHovered, setReciprocalHovered] = useState(0);
  const [reciprocalComment, setReciprocalComment] = useState("");
  const [showReciprocal, setShowReciprocal] = useState(false);

  const isReciprocal = active?.metadata?.reciprocal === true;

  useEffect(() => {
    if (active) {
      setRating(0);
      setReciprocalRating(0);
      setReciprocalComment("");
      setShowReciprocal(false);
    }
  }, [active?.entityId]);

  const handleComplete = useCallback(() => {
    if (!active) return;
    const returnTo = active.returnTo;
    haptic("medium");
    complete();
    setTimeout(() => navigate(returnTo), 300);
  }, [active, complete, navigate]);

  useEffect(() => {
    if (active?.step === "summary") {
      const timer = setTimeout(handleComplete, 4000);
      return () => clearTimeout(timer);
    }
  }, [active?.step, handleComplete]);

  const handleSkip = useCallback(() => {
    haptic("light");
    if (active?.step === "rating") {
      if (isReciprocal && !showReciprocal) {
        setShowReciprocal(true);
        return;
      }
      advance();
    } else {
      handleComplete();
    }
  }, [active?.step, advance, handleComplete, isReciprocal, showReciprocal]);

  const handleRate = useCallback((stars: number) => {
    setRating(stars);
    haptic("light");
    if (isReciprocal) {
      setTimeout(() => setShowReciprocal(true), 600);
    } else {
      setTimeout(() => advance(), 800);
    }
  }, [advance, isReciprocal]);

  const handleReciprocalRate = useCallback((stars: number) => {
    setReciprocalRating(stars);
    haptic("light");
    setTimeout(() => advance(), 800);
  }, [advance]);

  if (!active) return null;

  const labels = DOMAIN_LABELS[active.domain] ?? DOMAIN_LABELS.order;

  return (
    <AnimatePresence>
      <motion.div
        key="close-flow-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-max flex items-end justify-center"
        style={{ background: "hsl(var(--background) / 0.6)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-md rounded-t-3xl border border-border/30 p-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
          style={{ background: "hsl(var(--card))" }}
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--muted))" }}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {active.step === "rating" && !showReciprocal && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-5"
            >
              <div className="text-4xl">{labels.emoji}</div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{labels.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{labels.rateLabel}</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 1.3 }}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => handleRate(star)}
                    className="p-1"
                  >
                    <Star
                      className="h-8 w-8 transition-colors"
                      fill={(hoveredStar || rating) >= star ? "hsl(var(--accent))" : "transparent"}
                      stroke={(hoveredStar || rating) >= star ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.4)"}
                    />
                  </motion.button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground text-xs"
              >
                Skip
              </Button>
            </motion.div>
          )}

          {active.step === "rating" && showReciprocal && isReciprocal && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-5"
            >
              <div className="text-4xl">👤</div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Rate the passenger</h3>
                <p className="text-sm text-muted-foreground mt-1">How was your experience with this client?</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 1.3 }}
                    onMouseEnter={() => setReciprocalHovered(star)}
                    onMouseLeave={() => setReciprocalHovered(0)}
                    onClick={() => handleReciprocalRate(star)}
                    className="p-1"
                  >
                    <Star
                      className="h-8 w-8 transition-colors"
                      fill={(reciprocalHovered || reciprocalRating) >= star ? "hsl(var(--accent))" : "transparent"}
                      stroke={(reciprocalHovered || reciprocalRating) >= star ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.4)"}
                    />
                  </motion.button>
                ))}
              </div>

              <textarea
                value={reciprocalComment}
                onChange={(e) => setReciprocalComment(e.target.value)}
                placeholder="Optional comment..."
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-border/20 bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground/50"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => advance()}
                className="text-muted-foreground text-xs"
              >
                Skip
              </Button>
            </motion.div>
          )}

          {active.step === "summary" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "hsl(var(--success) / 0.15)" }}
              >
                <Check className="h-8 w-8" style={{ color: "hsl(var(--success))" }} />
              </motion.div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Thank you!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {rating > 0 ? `You rated ${rating}/5 ⭐` : "We appreciate your feedback"}
                </p>
              </div>

              <Button onClick={handleComplete} className="w-full">
                Done
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
