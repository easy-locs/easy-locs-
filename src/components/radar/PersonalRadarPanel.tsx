/**
 * PersonalRadarPanel — Personal mode overlay for HyperRadarPage.
 * Shows guidance cards, intent badges, mood chips, personalized feed.
 */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { buildUserContext } from "@/lib/engines/personal-radar/context-awareness-engine";
import { computeNextActions, type NextAction } from "@/lib/engines/personal-radar/next-best-action-engine";
import { personalizeEntities, type PersonalizedEntity } from "@/lib/engines/personal-radar/hyper-personalization-engine";
import { detectSessionIntent, getIntentBadge, pushSessionSignal } from "@/lib/engines/personal-radar/session-intelligence-engine";
import { loadRadarProfile, type UserRadarProfile } from "@/lib/engines/personal-radar/personal-profile-engine";
import {
  Sparkles, Zap, Eye, MapPin, Coffee, Moon, Utensils, Hotel, Car, ShoppingBag,
  Heart, ChevronUp, ChevronDown, User, Activity,
} from "lucide-react";

interface Entity {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  imageUrl?: string;
  image_url?: string;
}

const MOOD_CHIPS = [
  { id: "chill", label: "Chill", emoji: "😌" },
  { id: "food", label: "Food", emoji: "🍽️" },
  { id: "night", label: "Night", emoji: "🌙" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
  { id: "deals", label: "Deals", emoji: "🏷️" },
];

export default function PersonalRadarPanel({ entities, open }: { entities: Entity[]; open: boolean }) {
  const { user } = useAuth();
  const [personalMode, setPersonalMode] = useState(true);
  const [profile, setProfile] = useState<UserRadarProfile | null>(null);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    if (user?.id) {
      loadRadarProfile(user.id).then(setProfile).catch(() => {});
    }
  }, [user?.id]);

  const context = useMemo(() => buildUserContext({
    nearbyCategories: entities.map(e => e.category),
  }), [entities]);

  const actions = useMemo(() => computeNextActions(context, profile), [context, profile]);

  const { intent, confidence: intentConfidence } = useMemo(() => detectSessionIntent(), [entities]);
  const intentBadge = useMemo(() => getIntentBadge(intent), [intent]);

  const personalized = useMemo(() => {
    if (!personalMode) return [];
    return personalizeEntities(
      entities.map(e => ({
        ...e,
        distanceKm: e.distance ?? 99,
        imageUrl: e.imageUrl || e.image_url,
      })),
      profile,
      context,
    ).slice(0, 5);
  }, [entities, profile, context, personalMode]);

  if (!open) return null;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Personal Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-[10px] font-bold text-foreground">Personal Radar</span>
        </div>
        <button
          onClick={() => setPersonalMode(!personalMode)}
          className="px-2 py-0.5 rounded-full text-[9px] font-bold transition-all"
          style={{
            background: personalMode ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted) / 0.3)",
            color: personalMode ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
            border: `1px solid ${personalMode ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.2)"}`,
          }}
        >
          {personalMode ? "ON" : "OFF"}
        </button>
      </div>

      {/* Intent Badge */}
      {personalMode && intentConfidence > 40 && (
        <div className="flex items-center gap-2">
          <span className="text-sm">{intentBadge.emoji}</span>
          <span className="text-[10px] font-semibold text-foreground">{intentBadge.label}</span>
          <span className="text-[9px] text-muted-foreground">• {intentConfidence}% sure</span>
        </div>
      )}

      {/* Mood Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MOOD_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveMood(activeMood === chip.id ? null : chip.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold whitespace-nowrap border transition-all shrink-0"
            style={{
              background: activeMood === chip.id ? "hsl(var(--accent) / 0.15)" : "hsl(var(--card) / 0.6)",
              borderColor: activeMood === chip.id ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.15)",
              color: activeMood === chip.id ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
            }}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Next Best Actions */}
      {personalMode && actions.length > 0 && (
        <div>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">For you now</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {actions.slice(0, 4).map(a => (
              <div
                key={a.id}
                className="min-w-[130px] px-3 py-2 rounded-xl border border-border/20 shrink-0 cursor-pointer hover:border-accent/30 transition-all"
                style={{ background: "hsl(var(--background) / 0.6)" }}
                onClick={() => pushSessionSignal({ category: a.suggestedCategories[0], action: "click", timestamp: Date.now() })}
              >
                <p className="text-xs font-bold text-foreground">{a.title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{a.subtitle}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-1 flex-1 rounded-full bg-muted/30">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${a.confidence}%`,
                        background: a.confidence > 80 ? "hsl(var(--success))" : "hsl(var(--accent))",
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground">{a.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personalized Top 5 */}
      {personalMode && personalized.length > 0 && (
        <div>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Best for you</p>
          <div className="space-y-1.5">
            {personalized.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-border/15 cursor-pointer hover:border-accent/20 transition-all"
                style={{ background: "hsl(var(--background) / 0.5)" }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground capitalize">{p.category}</span>
                    {p.matchReasons[0] && (
                      <span className="text-[8px] px-1 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}>
                        {p.matchReasons[0]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--accent))" }}>{p.personalScore}</p>
                  <p className="text-[8px] text-muted-foreground">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
