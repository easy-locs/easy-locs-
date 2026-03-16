/**
 * EnhancedRatingPanel — Post-delivery rating with categories.
 * PASS80-L: Enhanced Ratings
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const RATING_CATEGORIES = [
  { id: "speed", label: "Rapidité", emoji: "⚡" },
  { id: "care", label: "Soin du colis", emoji: "📦" },
  { id: "communication", label: "Communication", emoji: "💬" },
  { id: "professionalism", label: "Professionnalisme", emoji: "👔" },
];

interface Props {
  jobId: string;
  driverId: string;
  onDone?: () => void;
  onCancel?: () => void;
}

export default function EnhancedRatingPanel({ jobId, driverId, onDone, onCancel }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!rating || !user) { toast.error("Sélectionnez une note"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("delivery_ratings").insert({
        job_id: jobId,
        driver_id: driverId,
        rated_by: user.id,
        rating,
        categories: selectedCategories.length > 0 ? selectedCategories : null,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      haptic("medium");
      toast.success("Merci pour votre avis !");
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.15)" }}
    >
      <h3 className="text-sm font-bold text-center" style={{ color: "hsl(var(--hud-text))" }}>
        ⭐ Noter la livraison
      </h3>

      {/* Stars */}
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => { setRating(n); haptic("light"); }}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="h-7 w-7"
              fill={n <= displayRating ? "hsl(var(--warning))" : "transparent"}
              style={{ color: n <= displayRating ? "hsl(var(--warning))" : "hsl(var(--hud-border) / 0.2)" }}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p className="text-center text-[10px] font-semibold" style={{ color: "hsl(var(--warning))" }}>
          {rating === 5 ? "Excellent !" : rating === 4 ? "Très bien" : rating === 3 ? "Correct" : rating === 2 ? "Décevant" : "Mauvais"}
        </p>
      )}

      {/* Categories */}
      {rating > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Qu'avez-vous apprécié ?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RATING_CATEGORIES.map(cat => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{
                    background: selected ? "hsl(var(--warning) / 0.12)" : "hsl(var(--hud-bg))",
                    border: `1px solid ${selected ? "hsl(var(--warning) / 0.3)" : "hsl(var(--hud-border) / 0.1)"}`,
                    color: selected ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim))",
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comment */}
      {rating > 0 && (
        <div>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Un commentaire ? (optionnel)"
            rows={2}
            className="text-xs"
            style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 text-xs h-9" onClick={handleSubmit}
          disabled={!rating || submitting}
          style={{ background: "hsl(var(--warning))", color: "hsl(var(--hud-bg))" }}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Envoyer</>}
        </Button>
        {onCancel && (
          <Button size="sm" variant="outline" className="text-xs h-9" onClick={onCancel}
            style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>
            Passer
          </Button>
        )}
      </div>
    </motion.div>
  );
}
