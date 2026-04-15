import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, CheckCircle, Clock, MessageCircle, Package, ShoppingBag,
  Shield, TrendingUp, Zap, Award, ChevronRight,
} from "lucide-react";
import { c2cService } from "@/services/domain/c2c.service";
import { c2cRepo, type C2CListingRow } from "@/repositories/domain/c2c.repo";
import C2CListingCard from "@/components/c2c/C2CListingCard";
import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import SEOHead from "@/components/SEOHead";
import { computeTrustLevel, getTrustBadge } from "@/lib/c2c/c2c-moderation";

function memberDuration(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 30) return `${days} jour${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} an${years > 1 ? "s" : ""} et ${rem} mois` : `${years} an${years > 1 ? "s" : ""}`;
}

export default function SellerProfile() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name?: string; avatar_url?: string; created_at?: string; email_verified?: boolean; phone_verified?: boolean } | null>(null);
  const [stats, setStats] = useState<{ activeListings: number; soldListings: number; avgRating: number; reviewCount: number; reviews: Array<{ rating: number; comment: string | null; reviewer_id: string; created_at: string }> } | null>(null);
  const [listings, setListings] = useState<C2CListingRow[]>([]);
  const [reviews, setReviews] = useState<Array<{ rating: number; comment: string | null; reviewer_id: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [statsRes, listingsRes, profileRes] = await Promise.all([
        c2cService.getSellerStats(userId),
        c2cRepo.getMyListings(userId, "active"),
        db.from("profiles").select("name, avatar_url, created_at, email_verified, phone_verified").eq("id", userId).maybeSingle(),
      ]);

      setStats(statsRes);
      setListings(listingsRes);
      setReviews(statsRes.reviews || []);
      setProfile(profileRes.data);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <SubPageShell>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="h-24 bg-muted/40 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-xl" />)}
          </div>
          <div className="h-40 bg-muted/30 animate-pulse rounded-xl" />
        </div>
      </SubPageShell>
    );
  }

  const memberDays = profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) : 0;
  const trustLevelComputed = computeTrustLevel({
    listingCount: stats?.activeListings ?? 0,
    soldCount: stats?.soldListings ?? 0,
    avgRating: stats?.avgRating ?? 0,
    reviewCount: stats?.reviewCount ?? 0,
    memberSinceDays: memberDays,
    isVerified: !!(profile?.phone_verified || profile?.email_verified),
    reportCount: 0,
  });
  const trustBadge = getTrustBadge(trustLevelComputed);
  const totalTransactions = (stats?.soldListings ?? 0) + (stats?.activeListings ?? 0);
  const displayReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: reviews.filter(rv => rv.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter(rv => rv.rating === r).length / reviews.length) * 100 : 0,
  }));

  return (
    <SubPageShell>
      <SEOHead
        title={`${profile?.name || "Vendeur"} — Profil vendeur | Annonces Easy-Locs`}
        description={`Profil de ${profile?.name || "vendeur"} : ${stats?.activeListings ?? 0} annonces, ${stats?.soldListings ?? 0} ventes, note ${stats?.avgRating || "—"}/5`}
        noindex
      />
      <div className="max-w-lg mx-auto pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-lg font-extrabold">Profil vendeur</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-black text-primary shadow-inner">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                (profile?.name || "V")[0].toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-extrabold">{profile?.name || "Vendeur"}</h2>
              {profile?.created_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> Membre depuis {memberDuration(profile.created_at)}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[11px] flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full ${trustBadge.color} bg-current/5`}>
                  {trustBadge.emoji} {trustBadge.label}
                </span>
                {profile?.email_verified && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="h-3 w-3" /> Email
                  </span>
                )}
                {profile?.phone_verified && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="h-3 w-3" /> Tél
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { value: stats?.activeListings ?? 0, label: "Actives", icon: Package, color: "text-primary" },
            { value: stats?.soldListings ?? 0, label: "Vendues", icon: ShoppingBag, color: "text-emerald-600" },
            { value: stats?.avgRating ? `${stats.avgRating}/5` : "—", label: `${stats?.reviewCount || 0} avis`, icon: Star, color: "text-amber-500" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-xl p-3.5 text-center"
              >
                <Icon className={`h-4 w-4 mx-auto mb-1 ${s.color} ${s.icon === Star ? "fill-current" : ""}`} />
                <p className="text-lg font-extrabold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/orbit")}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-bold mb-6 shadow-lg shadow-primary/20"
        >
          <MessageCircle className="h-4 w-4" /> Contacter le vendeur
        </motion.button>

        {reviews.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              Avis ({reviews.length})
            </h3>

            {reviews.length >= 3 && (
              <div className="bg-muted/30 rounded-xl p-3.5 mb-3 space-y-1.5">
                {ratingDistribution.map(r => (
                  <div key={r.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right font-medium">{r.stars}</span>
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-muted-foreground w-6 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2.5">
              {displayReviews.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border/50 rounded-xl p-3.5"
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className={`h-3 w-3 ${j < r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`} />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>}
                </motion.div>
              ))}
            </div>

            {reviews.length > 3 && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="mt-2 text-xs text-primary font-semibold flex items-center gap-1"
              >
                {showAllReviews ? "Voir moins" : `Voir les ${reviews.length} avis`}
                <ChevronRight className={`h-3 w-3 transition-transform ${showAllReviews ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
        )}

        {listings.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Annonces actives ({listings.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {listings.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <C2CListingCard listing={l} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
