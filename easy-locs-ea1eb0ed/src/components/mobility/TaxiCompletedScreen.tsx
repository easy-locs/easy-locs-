import React, { useState } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { ReceiptText, RotateCcw, Star, CheckCircle2, X, Heart, DollarSign, Navigation, MapPin, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIP_OPTIONS = [
  { label: "No tip", value: 0 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
];

export function TaxiCompletedScreen() {
  const { activeJobId, reset } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);
  const job = jobs.find(j => j.id === activeJobId);
  const [rating, setRating] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [selectedTip, setSelectedTip] = useState(0);
  const [tipSubmitted, setTipSubmitted] = useState(false);

  const handleRate = () => {
    if (rating === 0) { toast.info("Please select a rating"); return; }
    setRatingSubmitted(true);
    toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`);
  };

  const handleTip = () => {
    setTipSubmitted(true);
    if (selectedTip > 0) {
      toast.success(`Tip of ${selectedTip} ${job?.currency || "AED"} sent to driver`);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try { return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <motion.div
      key="taxi-completed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-4 py-4"
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(142 71% 45% / 0.15)" }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: "hsl(142 71% 45%)" }} />
          </div>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{ background: "hsl(38 65% 56% / 0.6)", left: "50%", top: "50%", marginLeft: -4, marginTop: -4 }}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: [0, 1, 0], x: Math.cos((i * Math.PI * 2) / 6) * 40, y: Math.sin((i * Math.PI * 2) / 6) * 40 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            />
          ))}
        </motion.div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Ride completed</h2>
          <p className="text-sm text-muted-foreground">Thank you for riding with Easy-Locs</p>
        </div>
      </div>

      {job && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/20 bg-card overflow-hidden"
        >
          <div className="p-4 text-center border-b border-border/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Total Fare</p>
            <p className="text-3xl font-bold text-foreground">{job.current_price ?? job.quoted_price} <span className="text-base text-muted-foreground">{job.currency}</span></p>
            <p className="text-[10px] text-muted-foreground mt-1 capitalize">{job.payment_status || "Wallet"} payment</p>
          </div>

          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-5 flex flex-col items-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142 71% 45%)" }} />
                <div className="w-px h-4 bg-border/30" />
              </div>
              <p className="text-xs text-foreground flex-1 min-w-0 line-clamp-1">{job.pickup_label || "Pickup"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(38 65% 56%)" }} />
              </div>
              <p className="text-xs text-foreground flex-1 min-w-0 line-clamp-1">{job.dropoff_label || "Dropoff"}</p>
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-border/10 text-[10px] text-muted-foreground">
              <span className="capitalize">{job.service_level.replace(/_/g, " ")}</span>
              {job.confirmation_code && <span className="font-mono">{job.confirmation_code}</span>}
              {job.completed_at && <span>{formatDate(job.completed_at)}</span>}
            </div>
          </div>
        </motion.div>
      )}

      {!ratingSubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border/20 bg-card p-4 text-center space-y-3"
        >
          <p className="text-sm font-bold text-foreground">How was your ride?</p>
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" onClick={() => setRating(s)} className="transition-all active:scale-90">
                <Star className={cn("w-9 h-9 transition-colors", s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRate}
            className="w-full py-3 rounded-xl text-sm font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: "hsl(220 40% 18%)" }}
          >
            Submit Rating
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 py-2"
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(142 71% 45%)" }} />
          <span className="text-sm font-medium" style={{ color: "hsl(142 71% 45%)" }}>Rating submitted</span>
        </motion.div>
      )}

      {!tipSubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-border/20 bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" style={{ color: "hsl(38 65% 56%)" }} />
            <span className="text-sm font-bold text-foreground">Add a tip for your driver</span>
          </div>
          <div className="flex gap-2">
            {TIP_OPTIONS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedTip(t.value)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                  selectedTip === t.value ? "text-white" : "border-border/20 text-muted-foreground bg-card/60"
                )}
                style={selectedTip === t.value ? { borderColor: "hsl(38 65% 56%)", background: "hsl(38 65% 56%)" } : undefined}
              >
                {t.value === 0 ? t.label : `${t.value}`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleTip}
            className="w-full py-3 rounded-xl text-sm font-bold active:scale-[0.97] transition-transform text-white"
            style={{ background: "hsl(38 65% 56%)" }}
          >
            {selectedTip > 0 ? `Send ${selectedTip} ${job?.currency || "AED"} tip` : "Skip tip"}
          </button>
        </motion.div>
      ) : selectedTip > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-2"
        >
          <Heart className="w-4 h-4 fill-current" style={{ color: "hsl(38 65% 56%)" }} />
          <span className="text-sm font-medium" style={{ color: "hsl(38 65% 56%)" }}>Tip sent — your driver appreciates it!</span>
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="space-y-2"
      >
        <button
          type="button"
          onClick={() => setShowReceipt(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/40 text-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
        >
          <ReceiptText className="w-4 h-4 shrink-0" /> View receipt
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white active:scale-[0.97] transition-transform"
          style={{ background: "hsl(220 40% 18%)" }}
        >
          <RotateCcw className="w-4 h-4 shrink-0" /> Book another ride
        </button>
      </motion.div>

      <AnimatePresence>
        {showReceipt && job && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-3xl p-5 w-full max-w-md space-y-4 border-t border-border/20 shadow-2xl pb-10"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Trip Receipt</h3>
                <button onClick={() => setShowReceipt(false)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center py-3">
                <p className="text-3xl font-bold text-foreground">{job.current_price ?? job.quoted_price} {job.currency}</p>
                {selectedTip > 0 && tipSubmitted && (
                  <p className="text-xs mt-1" style={{ color: "hsl(38 65% 56%)" }}>+ {selectedTip} {job.currency} tip</p>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Navigation className="w-4 h-4 shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
                  <span className="text-foreground flex-1 min-w-0 break-words">{job.pickup_label || "Pickup"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
                  <span className="text-foreground flex-1 min-w-0 break-words">{job.dropoff_label || "Dropoff"}</span>
                </div>
                <div className="border-t border-border/10 pt-3 space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium capitalize">{job.service_level.replace(/_/g, " ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium capitalize">{job.payment_status || "Wallet"}</span></div>
                  {job.confirmation_code && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{job.confirmation_code}</span></div>
                  )}
                  {job.created_at && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-xs">{formatDate(job.created_at)}</span></div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
