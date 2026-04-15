import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Heart, Clock, Tag, Zap, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface C2CListingCardProps {
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    photo_urls: string[];
    city?: string;
    condition?: string;
    created_at: string;
    slug?: string;
    price_type?: string;
    lat?: number | null;
    lng?: number | null;
    favorite_count?: number;
    view_count?: number;
    is_boosted?: boolean;
  };
  distanceKm?: number | null;
  userId?: string;
  compact?: boolean;
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "Correct",
  for_parts: "Pièces",
};

function formatPrice(price: number, currency: string): string {
  if (price === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Il y a quelques min";
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

export default function C2CListingCard({ listing, distanceKm, userId, compact }: C2CListingCardProps) {
  const [saved, setSaved] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const navigate = useNavigate();
  const cover = listing.photo_urls?.[0];

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.info("Connectez-vous pour sauvegarder");
      return;
    }
    try {
      const { toggleFollowListing } = await import("@/lib/c2c/listing-followers");
      const isNow = await toggleFollowListing(userId, listing.id);
      setSaved(isNow);
      toast.success(isNow ? "Ajouté aux favoris" : "Retiré des favoris", { duration: 1500 });
    } catch {
      setSaved(s => !s);
    }
  };

  return (
    <div
      className="bg-card rounded-xl border border-border/40 overflow-hidden cursor-pointer hover:shadow-lg hover:border-border/80 transition-all duration-200 group active:scale-[0.98]"
      onClick={() => navigate(`/annonces/${listing.slug || listing.id}`)}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {cover ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
            <img
              loading="lazy"
              src={cover}
              alt={listing.title}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <Tag className="h-10 w-10" />
          </div>
        )}

        <button
          onClick={handleSave}
          className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all duration-200 ${saved ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-black/30 text-white hover:bg-black/50"}`}
        >
          <Heart className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
        </button>

        {listing.is_boosted && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-0.5 shadow-md">
            <Zap className="h-2.5 w-2.5" /> BOOST
          </div>
        )}
        {!listing.is_boosted && listing.price_type === "free" && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-md">
            GRATUIT
          </div>
        )}

        {listing.photo_urls?.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            {listing.photo_urls.length} photos
          </div>
        )}

        {listing.condition === "new" && !listing.is_boosted && listing.price_type !== "free" && (
          <div className="absolute bottom-2 left-2 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
            Neuf
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{listing.title}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-extrabold text-primary">
            {listing.price_type === "on_demand" ? "Sur demande" : formatPrice(listing.price, listing.currency)}
          </span>
          {listing.price_type === "negotiable" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300 bg-amber-50/50">
              Négociable
            </Badge>
          )}
          {listing.condition && CONDITION_LABELS[listing.condition] && listing.condition !== "good" && listing.condition !== "new" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-muted-foreground/20 text-muted-foreground">
              {CONDITION_LABELS[listing.condition]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {listing.city && (
            <>
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{listing.city}</span>
            </>
          )}
          {distanceKm != null && distanceKm < 200 && (
            <>
              <span className="text-border/60">·</span>
              <span className="whitespace-nowrap font-medium text-primary/70">{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}</span>
            </>
          )}
          <span className="text-border/60">·</span>
          <span className="whitespace-nowrap">{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
