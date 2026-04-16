import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Tag, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Eye, Heart, Share2, Flag, MessageCircle, HandCoins, QrCode, ChevronRight as ChevRight,
  Shield, AlertTriangle, Package, Truck, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { c2cService } from "@/services/domain/c2c.service";
import type { C2CListingRow, C2COfferRow } from "@/repositories/domain/c2c.repo";
import { c2cRepo } from "@/repositories/domain/c2c.repo";
import C2CPaymentQrCard from "@/components/c2c/C2CPaymentQrCard";
import { findC2CSubcategory, C2C_CONDITIONS, C2C_PRICE_TYPES, C2C_DELIVERY_OPTIONS } from "@/lib/c2c/c2c-category-tree";
import C2COfferSheet from "@/components/c2c/C2COfferSheet";
import C2CReportSheet from "@/components/c2c/C2CReportSheet";
import C2CListingCard from "@/components/c2c/C2CListingCard";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { useLocationStore } from "@/stores/locationStore";
import { tc } from "@/lib/i18n-canonical";
import { useI18n } from "@/lib/i18n";
import { haversineKm } from "@/lib/geo/distance";
import SEOHead from "@/components/SEOHead";
import { getTrustBadge, computeTrustLevel, type TrustLevel } from "@/lib/c2c/c2c-moderation";

const CONDITION_LABEL_KEYS: Record<string, { key: string; color: string }> = {
  new: { key: "page.annonces.condition.new", color: "text-emerald-600 bg-emerald-500/10" },
  like_new: { key: "page.annonces.condition.like_new", color: "text-emerald-500 bg-emerald-500/10" },
  good: { key: "page.annonces.condition.good", color: "text-blue-600 bg-blue-500/10" },
  fair: { key: "page.annonces.condition.fair", color: "text-amber-600 bg-amber-500/10" },
  for_parts: { key: "page.annonces.condition.for_parts", color: "text-red-600 bg-red-500/10" },
};

const PRICE_INDICATOR_KEYS = {
  good_deal: { key: "page.annonces.price_indicator.good_deal", emoji: "🟢", color: "text-emerald-600", bg: "bg-emerald-500/5" },
  fair_price: { key: "page.annonces.price_indicator.fair_price", emoji: "🟡", color: "text-amber-600", bg: "bg-amber-500/5" },
  above_market: { key: "page.annonces.price_indicator.above_market", emoji: "🔴", color: "text-red-600", bg: "bg-red-500/5" },
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(price);
}

function timeSince(dateStr: string, t: (k: string) => string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return t("page.annonces.detail.just_now");
  if (diff < 3600) return t("page.annonces.detail.minutes_ago").replace("{{count}}", String(Math.floor(diff / 60)));
  if (diff < 86400) return t("page.annonces.detail.hours_ago").replace("{{count}}", String(Math.floor(diff / 3600)));
  if (diff < 2592000) return t("page.annonces.detail.days_ago").replace("{{count}}", String(Math.floor(diff / 86400)));
  return new Date(dateStr).toLocaleDateString();
}

export default function AnnonceDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<(C2CListingRow & { marketplace_providers?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showOffer, setShowOffer] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [priceIntel, setPriceIntel] = useState<{ indicator: string; avgPrice: number; medianPrice: number; count: number } | null>(null);
  const [similar, setSimilar] = useState<C2CListingRow[]>([]);
  const [saved, setSaved] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState<C2COfferRow | null>(null);
  const [showQrPayment, setShowQrPayment] = useState(false);
  const [showSafetyTips, setShowSafetyTips] = useState(false);

  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const locationLat = useLocationStore(s => s.getLat());
  const locationLng = useLocationStore(s => s.getLng());

  useEffect(() => {
    if (locationLat != null && locationLng != null) {
      setUserLoc({ lat: locationLat, lng: locationLng });
    }
  }, [locationLat, locationLng]);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await c2cService.getListingDetail(id);
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setListing(data);
      c2cService.incrementViews(id, data.view_count || 0).catch(() => {});

      if (data.subcategory && data.price > 0) {
        c2cService.getPriceIntelligence(data.subcategory, data.price).then(setPriceIntel).catch(() => {});
      }
      c2cService.getSimilarListings({ subcategory: data.subcategory, category: data.category, price: data.price, id }).then(setSimilar).catch(() => {});

      if (user?.id) {
        c2cRepo.getOffersForListing(data.id).then(offers => {
          const accepted = offers.find(o => o.buyer_id === user.id && o.status === "accepted");
          if (accepted) setAcceptedOffer(accepted);
        }).catch(() => {});

        const { isFollowingListing } = await import("@/lib/c2c/listing-followers");
        isFollowingListing(user.id, data.id).then(setSaved).catch(() => {});
      }
      setLoading(false);
    })();
  }, [id, user?.id]);

  const photos: string[] = useMemo(() => {
    if (!listing?.photo_urls) return [];
    return Array.isArray(listing.photo_urls) ? listing.photo_urls.filter(Boolean) : [];
  }, [listing]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0 && photoIdx < photos.length - 1) {
        setPhotoIdx(i => i + 1);
      } else if (touchDeltaX.current > 0 && photoIdx > 0) {
        setPhotoIdx(i => i - 1);
      }
    }
    touchDeltaX.current = 0;
  }, [photoIdx, photos.length]);

  const conditionInfo = listing?.condition ? CONDITION_LABEL_KEYS[listing.condition] : null;
  const catInfo = listing?.subcategory ? findC2CSubcategory(listing.subcategory) : null;
  const provider = listing?.marketplace_providers;
  const isOwner = user?.id && (listing?.user_id === user.id || provider?.user_id === user.id);
  const distanceKm = userLoc && listing?.lat && listing?.lng
    ? Math.round(haversineKm(userLoc.lat, userLoc.lng, listing.lat, listing.lng) * 10) / 10
    : null;

  const priceTypeLabel = C2C_PRICE_TYPES.find(p => p.value === listing?.price_type);
  const deliveryLabel = C2C_DELIVERY_OPTIONS.find(d => d.value === listing?.delivery_option);

  const seoJsonLd = listing ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description?.slice(0, 200) || listing.title,
    image: photos[0] || undefined,
    offers: {
      "@type": "Offer",
      price: listing.price || 0,
      priceCurrency: listing.currency || "EUR",
      availability: listing.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemCondition: listing.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    },
    ...(listing.city && { areaServed: { "@type": "City", name: listing.city } }),
  } : undefined;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing?.title, url });
        return;
      } catch {}
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("page.news.link_copied"), { duration: 1500 });
      } catch {}
    }
  };

  const handleOffer = async (amount: number, message: string, expiryHours: number | null) => {
    if (!user || !listing) return;
    const expiresAt = expiryHours ? new Date(Date.now() + expiryHours * 3600000).toISOString() : undefined;
    await c2cService.createOffer({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: provider?.user_id || listing.user_id,
      amount,
      currency: listing.currency || "EUR",
      message,
      expires_at: expiresAt,
    });
    toast.success(t("page.annonces.detail.offer_sent"), { description: t("page.annonces.detail.offer_sent_desc").replace("{{amount}}", formatPrice(amount, listing.currency || "EUR")) });
  };

  const handleReport = async (reason: string, details: string) => {
    if (!user || !listing) return;
    await c2cService.reportListing({ listing_id: listing.id, reporter_id: user.id, reason, details });
    toast.success(t("page.annonces.detail.report_sent"), { description: t("page.annonces.detail.report_sent_desc") });
  };

  const handleShowQrPayment = () => {
    if (!listing || !acceptedOffer) return;
    setShowQrPayment(true);
  };

  const toggleSave = async () => {
    if (!user || !listing) return;
    const { toggleFollowListing } = await import("@/lib/c2c/listing-followers");
    const isNow = await toggleFollowListing(user.id, listing.id);
    setSaved(isNow);
    toast.success(isNow ? t("page.annonces.detail.added_to_favorites") : t("page.annonces.detail.removed_from_favorites"), { duration: 1500 });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-0 flex-1 bg-background">
        <div className="p-4 space-y-4">
          <div className="w-full aspect-square bg-muted/40 rounded-2xl animate-pulse" />
          <div className="space-y-3">
            <div className="h-7 w-3/4 bg-muted/60 animate-pulse rounded-lg" />
            <div className="h-8 w-1/3 bg-muted/60 animate-pulse rounded-lg" />
            <div className="h-4 w-2/3 bg-muted/40 animate-pulse rounded" />
            <div className="h-20 bg-muted/30 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col min-h-0 flex-1 bg-background items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Tag className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="font-bold text-lg mb-1">{t("page.annonces.listing_label")}</p>
        <p className="text-sm text-muted-foreground mb-6">{t("page.annonces.not_found")}</p>
        <button onClick={() => navigate("/annonces")} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
          {t("page.annonces.back_to_listings")}
        </button>
      </div>
    );
  }

  if (!listing) return null;

  const customAttrs = listing.custom_attributes && typeof listing.custom_attributes === "object" ? listing.custom_attributes : {};
  const attrEntries = Object.entries(customAttrs).filter(([, v]) => v != null && v !== "" && v !== false);
  const priceInd = priceIntel ? PRICE_INDICATOR_KEYS[priceIntel.indicator as keyof typeof PRICE_INDICATOR_KEYS] : null;

  return (
    <SubPageShell noContentPad>
      <SEOHead
        title={`${listing.title} — ${listing.price != null && listing.price_type !== "free" ? formatPrice(listing.price, listing.currency || "EUR") : t("page.annonces.free")} | ${t("page.annonces.detail.seo_suffix")}`}
        description={listing.description?.slice(0, 160) || listing.title}
        canonical={`${window.location.origin}/annonces/${listing.slug || listing.id}`}
        ogImage={photos[0]}
        ogType="product"
        keywords={`${listing.title}, ${catInfo?.category.label || ""}, ${catInfo?.subcategory.label || ""}, annonce, occasion`}
        jsonLd={seoJsonLd}
      />
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 h-12 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted/60 -ml-1 active:scale-95 transition-transform"><ArrowLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold truncate flex-1">{listing.title}</span>
        <button onClick={handleShare} className="p-2 rounded-full hover:bg-muted/60 active:scale-95 transition-transform"><Share2 className="h-4 w-4" /></button>
        <button onClick={toggleSave} className={`p-2 rounded-full hover:bg-muted/60 active:scale-95 transition-all ${saved ? "text-red-500" : ""}`}>
          <Heart className={`h-4 w-4 transition-all ${saved ? "fill-current scale-110" : ""}`} />
        </button>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-5 max-w-lg mx-auto w-full">
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            ref={galleryRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/20 select-none"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={photoIdx}
                src={photos[photoIdx]}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-lg active:scale-95"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-lg active:scale-95"><ChevronRight className="h-4 w-4" /></button>
                <div className="absolute top-3 right-3 bg-background/70 backdrop-blur text-xs px-2.5 py-1 rounded-full font-semibold">{photoIdx + 1}/{photos.length}</div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`rounded-full transition-all duration-200 ${i === photoIdx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}

            {listing.status === "sold" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white text-black text-sm font-extrabold px-6 py-2 rounded-full -rotate-12 shadow-xl">{t("page.annonces.detail.sold_badge")}</div>
              </div>
            )}
          </motion.div>
        )}

        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === photoIdx ? "border-primary shadow-md" : "border-transparent opacity-60 hover:opacity-100"}`}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {catInfo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/annonces" className="hover:underline hover:text-foreground transition-colors">{t("page.annonces.detail.breadcrumb_annonces")}</Link>
            <ChevRight className="h-3 w-3" />
            <Link to={`/annonces/recherche?cat=${catInfo.category.key}`} className="hover:underline hover:text-foreground transition-colors">{catInfo.category.emoji} {catInfo.category.label}</Link>
            <ChevRight className="h-3 w-3" />
            <span className="text-foreground/70">{catInfo.subcategory.label}</span>
          </div>
        )}

        <div className="space-y-2.5">
          <h1 className="text-xl font-extrabold leading-tight">{listing.title}</h1>
          <div className="flex items-center gap-2.5 flex-wrap">
            {listing.price != null && listing.price_type !== "on_demand" ? (
              <span className="text-2xl font-black text-primary">
                {listing.price_type === "free" ? t("page.annonces.free") : formatPrice(listing.price, listing.currency || "EUR")}
              </span>
            ) : (
              <span className="text-base font-semibold text-muted-foreground">{t("page.annonces.on_demand")}</span>
            )}
            {priceTypeLabel && listing.price_type !== "fixed" && (
              <Badge variant="outline" className="text-xs font-semibold">{priceTypeLabel.emoji} {priceTypeLabel.label}</Badge>
            )}
            {conditionInfo && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${conditionInfo.color}`}>{t(conditionInfo.key)}</span>
            )}
          </div>

          {priceInd && priceIntel && (
            <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl ${priceInd.bg}`}>
              <span className="text-base">{priceInd.emoji}</span>
              <span className={priceInd.color}>{t(priceInd.key)}</span>
              <span className="text-muted-foreground font-normal">· {t("page.annonces.detail.avg_price")} {formatPrice(priceIntel.avgPrice, listing.currency || "EUR")} ({priceIntel.count} {t("page.annonces.detail.listings_count")})</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {listing.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary/60" />
                {listing.city}{listing.quartier ? `, ${listing.quartier}` : ""}
              </span>
            )}
            {distanceKm != null && <span className="text-primary/80 font-medium">{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm}km`}</span>}
            {listing.created_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeSince(listing.created_at, t)}</span>}
            {listing.view_count > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.view_count} {t("page.annonces.detail.views")}</span>}
          </div>
        </div>

        {deliveryLabel && (
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl border border-border/30">
            <div className="p-2 rounded-lg bg-primary/10">
              {listing.delivery_option === "ship" || listing.delivery_option === "both" ? <Truck className="h-4 w-4 text-primary" /> : <Package className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{deliveryLabel.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {listing.delivery_option === "hand" ? t("page.annonces.detail.delivery_hand") : listing.delivery_option === "ship" ? t("page.annonces.detail.delivery_ship") : t("page.annonces.detail.delivery_both")}
              </p>
            </div>
          </div>
        )}

        {attrEntries.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-sm font-bold">{t("page.annonces.detail.characteristics")}</h2>
            <div className="grid grid-cols-2 gap-2">
              {attrEntries.map(([key, value]) => (
                <div key={key} className="bg-muted/30 rounded-xl px-3.5 py-2.5 border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm font-semibold mt-0.5">{typeof value === "boolean" ? (value ? t("page.annonces.detail.yes") : t("page.annonces.detail.no")) : String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {listing.description && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold">{t("page.annonces.detail.description")}</h2>
            <p className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${!showFullDesc && listing.description.length > 300 ? "line-clamp-5" : ""}`}>
              {listing.description}
            </p>
            {listing.description.length > 300 && (
              <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-primary font-semibold">
                {showFullDesc ? t("page.annonces.detail.see_less") : t("page.annonces.detail.see_more")}
              </button>
            )}
          </div>
        )}

        {provider && (
          <Link to={`/annonces/vendeur/${provider.user_id || provider.id}`} className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-all active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary">
                {(provider.display_name || "V")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{provider.display_name || t("page.annonces.detail.seller")}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  {provider.is_verified && <span className="text-blue-500 flex items-center gap-0.5 font-medium"><CheckCircle className="h-3 w-3" /> Pro</span>}
                  {provider.trust_level && (() => {
                    const badge = getTrustBadge(provider.trust_level as TrustLevel);
                    return <span className={`flex items-center gap-0.5 font-medium ${badge.color}`}>{badge.emoji} {badge.label}</span>;
                  })()}
                  {provider.created_at && <span>{t("page.annonces.detail.member_since")} {new Date(provider.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>}
                </div>
              </div>
              <ChevRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        )}

        {listing.status === "sold" && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-600">{t("page.annonces.detail.item_sold")}</p>
              <p className="text-[11px] text-emerald-600/70">{t("page.annonces.detail.listing_unavailable")}</p>
            </div>
          </div>
        )}

        <button onClick={() => setShowSafetyTips(s => !s)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
          <Shield className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{t("page.annonces.detail.safety_tips")}</span>
          <ChevRight className={`h-3 w-3 ml-auto transition-transform ${showSafetyTips ? "rotate-90" : ""}`} />
        </button>

        <AnimatePresence>
          {showSafetyTips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 space-y-2.5">
                {[
                  t("page.annonces.detail.safety_tip_1"),
                  t("page.annonces.detail.safety_tip_2"),
                  t("page.annonces.detail.safety_tip_3"),
                  t("page.annonces.detail.safety_tip_4"),
                  t("page.annonces.detail.safety_tip_5"),
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
            <Flag className="h-3.5 w-3.5" /> {t("page.annonces.detail.report")}
          </button>
        </div>

        {similar.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold">{t("page.annonces.detail.similar_listings")}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {similar.map((s) => (
                <div key={s.id} className="shrink-0 w-44">
                  <C2CListingCard listing={s} compact />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isOwner && listing.status !== "sold" && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-safe"
        >
          <div className="max-w-lg mx-auto flex gap-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-2xl">
            {acceptedOffer ? (
              <>
                <button
                  onClick={() => navigate(`/orbit`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" /> {t("page.annonces.detail.contact")}
                </button>
                <button
                  onClick={handleShowQrPayment}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
                >
                  <QrCode className="h-4 w-4" /> {t("page.annonces.detail.pay_qr")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate(`/orbit`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" /> {t("page.annonces.detail.contact")}
                </button>
                <button
                  onClick={() => setShowOffer(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 active:scale-[0.98]"
                >
                  <HandCoins className="h-4 w-4" /> {t("page.annonces.detail.make_offer")}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {showOffer && (
        <C2COfferSheet
          listingTitle={listing.title}
          listingPrice={listing.price}
          currency={listing.currency || "EUR"}
          onSubmit={handleOffer}
          onClose={() => setShowOffer(false)}
        />
      )}

      {showReport && (
        <C2CReportSheet
          onSubmit={handleReport}
          onClose={() => setShowReport(false)}
        />
      )}

      {showQrPayment && acceptedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQrPayment(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <C2CPaymentQrCard
              listingId={listing.id}
              listingTitle={listing.title}
              listingPhoto={photos[0]}
              sellerId={listing.user_id}
              sellerName={provider?.display_name || t("page.annonces.detail.seller")}
              amount={acceptedOffer.counter_amount ?? acceptedOffer.amount}
              currency={listing.currency || "EUR"}
              offerId={acceptedOffer.id}
            />
            <div className="flex gap-2 max-w-sm mx-auto">
              <button
                onClick={() => navigate("/pay/scan")}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold shadow-lg active:scale-[0.98]"
              >
                <QrCode className="h-4 w-4" /> {t("page.annonces.detail.scan_myself")}
              </button>
              <button
                onClick={() => setShowQrPayment(false)}
                className="flex-1 py-3 bg-muted rounded-xl text-sm font-bold active:scale-[0.98]"
              >
                {t("page.annonces.detail.close")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </SubPageShell>
  );
}
