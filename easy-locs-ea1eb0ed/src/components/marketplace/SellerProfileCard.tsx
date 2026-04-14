import { useState, useEffect } from "react";
import { Star, ShieldCheck, Package, Calendar, Award } from "lucide-react";
import { db } from "@/services/db";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface SellerProfile {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  memberSince: string;
  activeListings: number;
  soldListings: number;
  averageRating: number;
  reviewCount: number;
  isPro: boolean;
}

interface Props {
  providerId: string;
  userId?: string;
  compact?: boolean;
}

async function fetchSellerProfile(providerId: string): Promise<SellerProfile | null> {
  const { data: provider } = await db
    .from("marketplace_providers")
    .select("id, display_name, user_id, created_at, is_verified")
    .eq("id", providerId)
    .maybeSingle();

  if (!provider) return null;

  const [
    { count: activeCount },
    { count: soldCount },
    { data: reviews },
  ] = await Promise.all([
    db.from("marketplace_services").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("active", true),
    db.from("marketplace_services").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("status", "sold"),
    db.from("marketplace_reviews").select("rating").eq("provider_id", providerId),
  ]);

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  let displayName = provider.display_name || "Particulier";
  if (!displayName && provider.user_id) {
    const { data: profile } = await db.from("profiles").select("name").eq("id", provider.user_id).maybeSingle();
    displayName = profile?.name || "Particulier";
  }

  return {
    id: provider.id,
    displayName,
    avatarUrl: null,
    memberSince: provider.created_at,
    activeListings: activeCount ?? 0,
    soldListings: soldCount ?? 0,
    averageRating: Math.round(avgRating * 10) / 10,
    reviewCount: reviews?.length ?? 0,
    isPro: provider.is_verified ?? false,
  };
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  if (months < 1) return "Membre depuis quelques jours";
  if (months < 12) return `Membre depuis ${months} mois`;
  const years = Math.floor(months / 12);
  return `Membre depuis ${years} an${years > 1 ? "s" : ""}`;
}

export default function SellerProfileCard({ providerId, compact = false }: Props) {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSellerProfile(providerId)
      .then(setSeller)
      .catch(() => setSeller(null))
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) {
    return (
      <div className={`rounded-xl border border-border/50 bg-card p-4 animate-pulse ${compact ? "" : "space-y-3"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-2.5 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const initials = seller.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
          {initials}
        </div>
        <span className="text-sm font-medium text-foreground">{seller.displayName}</span>
        {seller.isPro ? (
          <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-500/50 text-blue-600 dark:text-blue-400">Pro</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] h-4 px-1 border-muted-foreground/30 text-muted-foreground">Particulier</Badge>
        )}
        {seller.averageRating > 0 && (
          <span className="text-xs text-amber-500 flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-current" /> {seller.averageRating.toFixed(1)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-lg font-bold shrink-0">
          {seller.avatarUrl ? (
            <OptimizedImage src={seller.avatarUrl} alt={seller.displayName} className="w-full h-full rounded-full" width={200} sizes="48px" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground truncate">{seller.displayName}</h4>
            {seller.isPro ? (
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] px-1.5 h-4">
                <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Pro
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-muted-foreground/30 text-muted-foreground">
                <Award className="h-2.5 w-2.5 mr-0.5" /> Particulier
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {formatMemberSince(seller.memberSince)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1 text-foreground font-semibold text-sm">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {seller.activeListings}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Annonces actives</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1 text-foreground font-semibold text-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            {seller.soldListings}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Vendus</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <div className="flex items-center justify-center gap-1 text-amber-500 font-semibold text-sm">
            <Star className="h-3.5 w-3.5 fill-current" />
            {seller.reviewCount > 0 ? seller.averageRating.toFixed(1) : "–"}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {seller.reviewCount > 0 ? `${seller.reviewCount} avis` : "Pas d'avis"}
          </p>
        </div>
      </div>
    </div>
  );
}
