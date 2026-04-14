/**
 * C2CListingDetail — Public detail page for C2C classified ads.
 * Shows photos, price, condition, description, seller profile and contact button.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/services/db";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Tag,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import SellerProfileCard from "@/components/marketplace/SellerProfileCard";
import ContactSellerButton from "@/components/marketplace/ContactSellerButton";
import { useUiEngine } from "@/hooks/useUiEngine";

const CONDITION_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: "Neuf", color: "text-emerald-600 bg-emerald-500/10" },
  like_new: { label: "Comme neuf", color: "text-emerald-500 bg-emerald-500/10" },
  good: { label: "Bon état", color: "text-blue-600 bg-blue-500/10" },
  fair: { label: "État correct", color: "text-amber-600 bg-amber-500/10" },
  for_parts: { label: "Pour pièces", color: "text-red-600 bg-red-500/10" },
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(price);
}

function timeSince(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function PhotoGallery({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!photos.length) {
    return <div className="w-full aspect-square bg-muted/40 rounded-2xl flex items-center justify-center"><Tag className="h-12 w-12 text-muted-foreground/30" /></div>;
  }
  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/20">
      <img src={photos[idx]} alt="" className="w-full h-full object-cover" />
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIdx(i => (i + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
      {photos.length > 1 && (
        <div className="absolute top-3 right-3 bg-background/70 backdrop-blur text-xs px-2 py-1 rounded-full font-medium">
          {idx + 1}/{photos.length}
        </div>
      )}
    </div>
  );
}

export default function C2CListingDetail() {
  useUiEngine("marketplace-c2clistingdetail");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    (async () => {
      const { data, error } = await db
        .from("marketplace_services")
        .select("*, marketplace_providers(id, display_name, user_id, is_verified, created_at)")
        .eq("id", id)
        .eq("active", true)
        .in("category", ["c2c_vehicles", "c2c_electronics", "c2c_fashion", "c2c_home", "c2c_sports", "c2c_misc", "automotive", "electronics", "fashion", "other"])
        .maybeSingle();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      setListing(data);
      if (data.marketplace_providers) setProvider(data.marketplace_providers);

      // Increment view count (fire and forget)
      db.from("marketplace_services")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id)
        .then(() => {});

      setLoading(false);
    })();
  }, [id]);

  const photos: string[] = listing?.photo_urls
    ? Array.isArray(listing.photo_urls)
      ? listing.photo_urls.filter(Boolean)
      : typeof listing.photo_urls === "object"
        ? Object.values(listing.photo_urls).filter(Boolean) as string[]
        : []
    : [];

  const condition = listing?.condition ? CONDITION_LABEL[listing.condition] : null;
  const isExpired = listing?.listing_expires_at && new Date(listing.listing_expires_at) < new Date();

  if (loading) {
    return (
      <div className="flex flex-col min-h-0 flex-1 bg-background">
        <div className="px-4 pt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-4 space-y-4">
          <div className="w-full aspect-square bg-muted/40 rounded-2xl animate-pulse" />
          <div className="h-7 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-5 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col min-h-0 flex-1 bg-background items-center justify-center p-8 text-center">
        <Tag className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="font-semibold text-foreground mb-1">Annonce introuvable</p>
        <p className="text-sm text-muted-foreground mb-6">Cette annonce n'existe pas ou a été supprimée.</p>
        <button onClick={() => navigate("/marketplace/c2c")} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
          Retour aux annonces
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/50 px-4 h-12 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted/60 transition-colors -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground truncate">{listing?.title || "Annonce"}</span>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-5 max-w-lg mx-auto w-full">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <PhotoGallery photos={photos} />
        </motion.div>

        {/* Title & price */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-foreground leading-tight">{listing.title}</h1>
            {isExpired && (
              <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
                <Clock className="h-3 w-3" /> Expirée
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {listing.price != null && listing.price > 0 ? (
              <span className="text-2xl font-extrabold text-primary">
                {formatPrice(listing.price, listing.currency || "EUR")}
              </span>
            ) : (
              <span className="text-base font-semibold text-muted-foreground">Prix à débattre</span>
            )}
            {condition && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${condition.color}`}>
                {condition.label}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {listing.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {listing.city}
              </span>
            )}
            {listing.published_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeSince(listing.published_at)}
              </span>
            )}
            {listing.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {listing.view_count} vues
              </span>
            )}
            {listing.listing_expires_at && !isExpired && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Expire le {new Date(listing.listing_expires_at).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </motion.div>

        {/* Description */}
        {listing.description && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </motion.div>
        )}

        {/* Category */}
        {listing.category && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{listing.category.replace(/^c2c_/, "").replace(/_/g, " ")}</span>
            {listing.status === "sold" && (
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="h-3 w-3" /> Vendu
              </span>
            )}
          </motion.div>
        )}

        {/* Seller profile */}
        {provider && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <SellerProfileCard providerId={provider.id} />
          </motion.div>
        )}
      </div>

      {/* Sticky CTA — Contact seller */}
      {provider?.user_id && listing.status !== "sold" && !isExpired && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-safe">
          <div className="max-w-lg mx-auto">
            <ContactSellerButton
              listingId={listing.id}
              listingTitle={listing.title}
              sellerUserId={provider.user_id}
              sellerName={provider.display_name || "Vendeur"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
