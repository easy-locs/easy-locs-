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
  Sparkles, MapPin, Star, TrendingUp, Gem, Clock,
  MessageCircle, Navigation,
} from "lucide-react";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import {
  BopCard,
  BopCardIcon,
  BopCardContent,
  BopCardTitle,
  BopCardMeta,
  BopCardActions,
  BopCardActionButton,
  BopCardSkeleton,
  BopEmptyState,
  BOP_INNER_ICON_SIZE,
  BOP_ACTION_ICON_SIZE,
} from "@/components/radar/BopCard";

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setProfileLoading(true);
      loadRadarProfile(user.id)
        .then(setProfile)
        .catch((e) => console.warn("[radar] profile load failed", e))
        .finally(() => setProfileLoading(false));
    }
  }, [user?.id]);

  const context = useMemo(() => buildUserContext({
    nearbyCategories: entities.map(e => e.category || "service"),
  }), [entities]);

  const actions = useMemo(() => computeNextActions(context, profile), [context, profile]);

  const { intent, confidence: intentConfidence } = useMemo(() => detectSessionIntent(), [entities]);
  const intentBadge = useMemo(() => getIntentBadge(intent), [intent]);

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

  const bestNow = useMemo(() => allPersonalized.slice(0, 5), [allPersonalized]);

  const trending = useMemo(() => {
    return [...allPersonalized]
      .filter(e => (e.rating ?? 0) >= 4.0 && e.distanceKm < 3)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }, [allPersonalized]);

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

  const formatDistance = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

  if (!open) return null;

  return (
    <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-[0.625rem] font-bold text-foreground">Personal Radar</span>
        </div>
        <button
          onClick={() => setPersonalMode(!personalMode)}
          className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold transition-all border ${
            personalMode
              ? "bg-accent/15 text-accent border-accent/30"
              : "bg-muted/30 text-muted-foreground border-border/20"
          }`}
        >
          {personalMode ? "ON" : "OFF"}
        </button>
      </div>

      {personalMode && intentConfidence > 40 && (
        <div className="flex items-center gap-2">
          <span className="text-sm">{intentBadge.emoji}</span>
          <span className="text-[0.625rem] font-semibold text-foreground">{intentBadge.label}</span>
          <span className="text-[0.625rem] text-muted-foreground">• {intentConfidence}% sure</span>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MOOD_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveMood(activeMood === chip.id ? null : chip.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[0.625rem] font-semibold whitespace-nowrap border transition-all shrink-0 ${
              activeMood === chip.id
                ? "bg-accent/15 border-accent/30 text-accent"
                : "bg-card/60 border-border/15 text-muted-foreground"
            }`}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {personalMode && profileLoading && entities.length === 0 && (
        <BopCardSkeleton count={3} />
      )}

      {personalMode && !profileLoading && actions.length === 0 && bestNow.length === 0 && trending.length === 0 && hiddenGems.length === 0 && (
        <BopEmptyState message="No personalized picks right now — explore nearby." />
      )}

      {personalMode && actions.length > 0 && (
        <Section icon={<Clock className="w-3 h-3" />} title="For You Now" accent>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {actions.slice(0, 4).map(a => (
              <BopCard
                key={a.id}
                className="min-w-[140px] shrink-0 flex-col !items-start !gap-0"
                onClick={() => pushSessionSignal({ category: a.suggestedCategories[0], action: "click", timestamp: Date.now() })}
              >
                <p className="text-xs font-bold text-foreground line-clamp-1">{a.title}</p>
                <p className="text-[0.6875rem] text-muted-foreground mt-1 line-clamp-2 leading-snug">{a.subtitle}</p>
              </BopCard>
            ))}
          </div>
        </Section>
      )}

      {personalMode && bestNow.length > 0 && (
        <Section icon={<Star className="w-3 h-3" />} title="Best Now">
          <div className="space-y-2">
            {bestNow.map((p, i) => (
              <EntityBopRow
                key={p.id}
                entity={p}
                rank={i + 1}
                isTop={i < 3}
                onView={() => navigate(entityUrl({ id: p.id }))}
                onChat={() => handleChat(p as any)}
                formatDistance={formatDistance}
              />
            ))}
          </div>
        </Section>
      )}

      {personalMode && trending.length > 0 && (
        <Section icon={<TrendingUp className="w-3 h-3" />} title="Trending Nearby">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {trending.map(t => (
              <BopCard
                key={t.id}
                className="min-w-[120px] shrink-0 flex-col !items-stretch !gap-0 !p-0 overflow-hidden"
                onClick={() => navigate(entityUrl({ id: t.id }))}
              >
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.name} className="w-full h-16 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-16 bg-muted/15 flex items-center justify-center">
                    <MapPin className={`${BOP_INNER_ICON_SIZE} text-muted-foreground/30`} />
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-[0.625rem] font-bold text-foreground break-words leading-snug">{t.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {t.rating && (
                      <span className="flex items-center gap-0.5 text-[0.625rem]">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {t.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[0.625rem] text-muted-foreground">{formatDistance(t.distanceKm)}</span>
                  </div>
                </div>
              </BopCard>
            ))}
          </div>
        </Section>
      )}

      {personalMode && hiddenGems.length > 0 && (
        <Section icon={<Gem className="w-3 h-3" />} title="Hidden Gems">
          <div className="space-y-2">
            {hiddenGems.map(g => (
              <EntityBopRow
                key={g.id}
                entity={g}
                onView={() => navigate(entityUrl({ id: g.id }))}
                onChat={() => handleChat(g as any)}
                badge="gem"
                formatDistance={formatDistance}
              />
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  );
}

function Section({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={accent ? "text-accent" : "text-muted-foreground"}>{icon}</span>
        <p className={`text-[0.625rem] font-bold uppercase tracking-wider ${accent ? "text-accent" : "text-muted-foreground"}`}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function EntityBopRow({ entity, rank, isTop, onView, onChat, badge, formatDistance }: {
  entity: PersonalizedEntity;
  rank?: number;
  isTop?: boolean;
  onView: () => void;
  onChat: () => void;
  badge?: "gem";
  formatDistance: (km: number) => string;
}) {
  const img = entity.imageUrl || (entity as any).image_url;
  const distKm = entity.distanceKm;
  const distLabel = distKm != null ? formatDistance(distKm) : null;

  return (
    <BopCard onClick={onView} highlight={isTop}>
      <BopCardIcon className={isTop ? "bg-accent/10" : "bg-muted/12"}>
        {img ? (
          <img src={img} alt={entity.name} className="w-full h-full rounded-xl object-cover" loading="lazy" />
        ) : rank ? (
          <span className={`text-sm font-bold ${isTop ? "text-accent" : "text-muted-foreground"}`}>#{rank}</span>
        ) : badge === "gem" ? (
          <Gem className={`${BOP_INNER_ICON_SIZE} text-purple-500`} />
        ) : (
          <MapPin className={`${BOP_INNER_ICON_SIZE} text-muted-foreground/40`} />
        )}
      </BopCardIcon>

      <BopCardContent>
        <BopCardTitle>{entity.name}</BopCardTitle>
        <BopCardMeta>
          <span className="text-[0.6875rem] text-muted-foreground capitalize">{(entity.category || "").replace(/_/g, " ")}</span>
          {entity.rating != null && entity.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[0.6875rem] font-semibold text-emerald-500">
              <Star className="w-3 h-3 fill-current" />{entity.rating.toFixed(1)}
            </span>
          )}
          {distLabel && <span className="text-[0.6875rem] text-muted-foreground">{distLabel}</span>}
        </BopCardMeta>
      </BopCardContent>

      <BopCardActions>
        <BopCardActionButton
          icon={<MessageCircle className={`${BOP_ACTION_ICON_SIZE} text-primary`} />}
          onClick={() => onChat()}
          label="Chat"
        />
        <BopCardActionButton
          icon={<Navigation className={`${BOP_ACTION_ICON_SIZE} text-primary`} />}
          onClick={() => useInAppNavigation.getState().openNavigation({ lat: entity.lat, lng: entity.lng, label: entity.name })}
          label="Navigate"
        />
      </BopCardActions>
    </BopCard>
  );
}

export default memo(PersonalRadarPanel);
