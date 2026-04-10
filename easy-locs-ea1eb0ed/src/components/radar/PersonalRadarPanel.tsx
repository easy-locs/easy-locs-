/**
 * PersonalRadarPanel — AI-powered personal radar with 4 smart sections:
 * For You Now, Best Now, Trending Nearby, Hidden Gems.
 * Wired to real engines: context-awareness, hyper-personalization, profile, session intelligence.
 */
import { useState, useMemo, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { buildUserContext } from "@/lib/engines/personal-radar/context-awareness-engine";
import { computeNextActions } from "@/lib/engines/personal-radar/next-best-action-engine";
import { personalizeEntities, type PersonalizedEntity } from "@/lib/engines/personal-radar/hyper-personalization-engine";
import { detectSessionIntent, getIntentBadge, pushSessionSignal } from "@/lib/engines/personal-radar/session-intelligence-engine";
import { loadRadarProfile, type UserRadarProfile } from "@/lib/engines/personal-radar/personal-profile-engine";
import { openOrbitFromRadar } from "@/lib/radar/radar-orbit-bridge";
import { entityUrl } from "@/lib/entity/entity-url";
import {
  Sparkles, Zap, MapPin, Star, TrendingUp, Gem, Clock,
  MessageCircle, Navigation, Eye,
} from "lucide-react";

interface Entity {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  imageUrl?: string;
  image_url?: string;
  slug?: string;
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

function PersonalRadarPanel({ entities, open }: { entities: Entity[]; open: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [personalMode, setPersonalMode] = useState(true);
  const [profile, setProfile] = useState<UserRadarProfile | null>(null);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadRadarProfile(user.id).then(setProfile).catch(() => {});
    }
  }, [user?.id]);

  const context = useMemo(() => buildUserContext({
    nearbyCategories: entities.map(e => e.category || "service"),
  }), [entities]);

  const actions = useMemo(() => computeNextActions(context, profile), [context, profile]);

  const { intent, confidence: intentConfidence } = useMemo(() => detectSessionIntent(), [entities]);
  const intentBadge = useMemo(() => getIntentBadge(intent), [intent]);

  // All personalized entities
  const allPersonalized = useMemo(() => {
    if (!personalMode) return [];
    return personalizeEntities(
      entities.map(e => ({
        ...e,
        distanceKm: e.distance ?? 99,
        imageUrl: e.imageUrl || e.image_url,
      })),
      profile,
      context,
    );
  }, [entities, profile, context, personalMode]);

  // Section: Best Now (top 5 by personal score)
  const bestNow = useMemo(() => allPersonalized.slice(0, 5), [allPersonalized]);

  // Section: Trending Nearby (high rating + close)
  const trending = useMemo(() => {
    return [...allPersonalized]
      .filter(e => (e.rating ?? 0) >= 4.0 && e.distanceKm < 3)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }, [allPersonalized]);

  // Section: Hidden Gems (lower popularity, decent score, not in top picks)
  const hiddenGems = useMemo(() => {
    const topIds = new Set(bestNow.map(e => e.id));
    return allPersonalized
      .filter(e => !topIds.has(e.id) && e.personalScore >= 40 && e.personalScore < 75 && e.distanceKm < 5)
      .slice(0, 4);
  }, [allPersonalized, bestNow]);

  const handleChat = (entity: Entity) => {
    if (user?.id) {
      openOrbitFromRadar(entity, user.id, navigate);
    } else {
      navigate(`/auth`);
    }
  };

  if (!open) return null;

  return (
    <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-[10px] font-bold text-foreground">Personal Radar</span>
        </div>
        <button
          onClick={() => setPersonalMode(!personalMode)}
          className="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all"
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
          <span className="text-[10px] text-muted-foreground">• {intentConfidence}% sure</span>
        </div>
      )}

      {/* Mood Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MOOD_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveMood(activeMood === chip.id ? null : chip.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all shrink-0"
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

      {/* ══ FOR YOU NOW ══ */}
      {personalMode && actions.length > 0 && (
        <Section icon={<Clock className="w-3 h-3" />} title="For You Now" accent>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {actions.slice(0, 4).map(a => (
              <div
                key={a.id}
                className="min-w-[140px] px-3.5 py-3 rounded-2xl border border-border/15 shrink-0 cursor-pointer active:scale-[0.97] transition-all"
                style={{ background: "hsl(var(--background) / 0.6)" }}
                onClick={() => pushSessionSignal({ category: a.suggestedCategories[0], action: "click", timestamp: Date.now() })}
              >
                <p className="text-xs font-bold text-foreground line-clamp-1">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">{a.subtitle}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ BEST NOW ══ */}
      {personalMode && bestNow.length > 0 && (
        <Section icon={<Star className="w-3 h-3" />} title="Best Now">
          <div className="space-y-1">
            {bestNow.map((p, i) => (
              <EntityRow
                key={p.id}
                entity={p}
                rank={i + 1}
                isTop={i < 3}
                onView={() => navigate(entityUrl({ id: p.id }))}
                onChat={() => handleChat(p as any)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ══ TRENDING NEARBY ══ */}
      {personalMode && trending.length > 0 && (
        <Section icon={<TrendingUp className="w-3 h-3" />} title="Trending Nearby">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {trending.map(t => (
              <div
                key={t.id}
                className="min-w-[120px] rounded-xl border border-border/15 overflow-hidden shrink-0 cursor-pointer active:scale-[0.97] transition-transform"
                onClick={() => navigate(entityUrl({ id: t.id }))}
              >
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.name} className="w-full h-16 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-16 bg-muted/15 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-bold text-foreground break-words leading-snug">{t.name}</p>
                  <div className="flex items-center gap-1">
                    {t.rating && <span className="flex items-center gap-0.5 text-[10px]"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{t.rating.toFixed(1)}</span>}
                    <span className="text-[10px] text-muted-foreground">{t.distanceKm < 1 ? `${Math.round(t.distanceKm * 1000)}m` : `${t.distanceKm.toFixed(1)}km`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ HIDDEN GEMS ══ */}
      {personalMode && hiddenGems.length > 0 && (
        <Section icon={<Gem className="w-3 h-3" />} title="Hidden Gems">
          <div className="space-y-1">
            {hiddenGems.map(g => (
              <EntityRow
                key={g.id}
                entity={g}
                onView={() => navigate(entityUrl({ id: g.id }))}
                onChat={() => handleChat(g as any)}
                badge="gem"
              />
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  );
}

/* ── Shared components ── */

function Section({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: accent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function EntityRow({ entity, rank, isTop, onView, onChat, badge }: {
  entity: PersonalizedEntity;
  rank?: number;
  isTop?: boolean;
  onView: () => void;
  onChat: () => void;
  badge?: "gem";
}) {
  const img = entity.imageUrl || (entity as any).image_url;
  const distKm = entity.distanceKm;
  const distLabel = distKm != null
    ? distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`
    : null;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: isTop ? "hsl(var(--accent) / 0.04)" : "hsl(var(--background) / 0.5)",
        borderColor: isTop ? "hsl(var(--accent) / 0.15)" : "hsl(var(--border) / 0.1)",
      }}
      onClick={onView}
    >
      {img ? (
        <img src={img} alt={entity.name} className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted) / 0.12)" }}>
          {rank ? (
            <span className="text-sm font-bold" style={{ color: isTop ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>#{rank}</span>
          ) : badge === "gem" ? (
            <Gem className="w-4 h-4" style={{ color: "hsl(270 60% 55%)" }} />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground/40" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground line-clamp-1 leading-snug">{entity.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground capitalize">{(entity.category || "").replace(/_/g, " ")}</span>
          {entity.rating != null && entity.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: "hsl(45 90% 50%)" }}>
              <Star className="w-3 h-3 fill-current" />{entity.rating.toFixed(1)}
            </span>
          )}
          {distLabel && (
            <span className="text-[11px] text-muted-foreground">{distLabel}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onChat(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.1)" }}
        >
          <MessageCircle className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); const q = `${entity.lat},${entity.lng}`; window.open(`https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer"); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.1)" }}
        >
          <Navigation className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
        </button>
      </div>
    </div>
  );
}

export default memo(PersonalRadarPanel);
