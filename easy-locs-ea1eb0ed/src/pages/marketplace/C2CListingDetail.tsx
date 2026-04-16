/**
 * C2CListingDetail — Public detail page for C2C classified ads.
 * Shows photos, price, condition, description, seller profile and contact button.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchC2CListingDetail, incrementListingViewCount } from "@/services/domain/marketplace.service";
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
import SubPageShell from "@/components/layout/SubPageShell";
import { useI18n } from "@/lib/i18n";

const CONDITION_LABEL_KEYS: Record<string, { labelKey: string; color: string }> = {
  new: { labelKey: "page.c2c.condition_new", color: "text-emerald-600 bg-emerald-500/10" },
  like_new: { labelKey: "page.c2c.condition_like_new", color: "text-emerald-500 bg-emerald-500/10" },
  good: { labelKey: "page.c2c.condition_good", color: "text-blue-600 bg-blue-500/10" },
  fair: { labelKey: "page.c2c.condition_fair", color: "text-amber-600 bg-amber-500/10" },
  for_parts: { labelKey: "page.c2c.condition_for_parts", color: "text-red-600 bg-red-500/10" },
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(price);
}

function timeSince(dateStr: string, t: (k: string) => string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return t("page.c2c.time_just_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("page.c2c.time_minutes_ago").replace("{{count}}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("page.c2c.time_hours_ago").replace("{{count}}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t("page.c2c.time_days_ago").replace("{{count}}", String(days));
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function PhotoGallery({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!photos.length) {
    return <div className="w-full aspect-square bg-muted/40 rounded-2xl flex items-center justify-center"><Tag className="h-12 w-12 text-muted-foreground/30" /></div>;
  }
  return (
    <SubPageShell>
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/20">
      <img loading="lazy" src={photos[idx]} alt={`Listing photo ${idx + 1}`} className="w-full h-full object-cover" />
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
    </SubPageShell>
  );
}

export default function C2CListingDetail() {
  useUiEngine("marketplace-c2clistingdetail");
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    (async () => {
      const { data, error } = await fetchC2CListingDetail(id);

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      setListing(data);
      if (data.marketplace_providers) setProvider(data.marketplace_providers);

      incrementListingViewCount(id, data.view_count || 0).catch(() => {});

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

  const condition = listing?.condition ? CONDITION_LABEL_KEYS[listing.condition] : null;
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
        <p className="font-semibold text-foreground mb-1">{t("page.c2c.listing_not_found")}</p>
        <p className="text-sm text-muted-foreground mb-6">{t("page.c2c.listing_not_found_sub")}</p>
        <button onClick={() => navigate("/marketplace/c2c")} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
          {t("page.c2c.back_to_listings")}
        </button>
      </div>
    );
  }

  return (
    <SubPageShell noContentPad>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/50 px-4 h-12 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted/60 transition-colors -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground truncate">{listing?.title || t("page.c2c.listing_label")}</span>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-5 max-w-lg mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <PhotoGallery photos={photos} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-foreground leading-tight">{listing.title}</h1>
            {isExpired && (
              <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
                <Clock className="h-3 w-3" /> {t("page.c2c.expired")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {listing.price != null && listing.price > 0 ? (
              <span className="text-2xl font-extrabold text-primary">
                {formatPrice(listing.price, listing.currency || "EUR")}
              </span>
            ) : (
              <span className="text-base font-semibold text-muted-foreground">{t("page.c2c.price_negotiable")}</span>
            )}
            {condition && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${condition.color}`}>
                {t(condition.labelKey)}
              </span>
            )}
          </div>

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
                {timeSince(listing.published_at, t)}
              </span>
            )}
            {listing.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {listing.view_count} {t("page.c2c.views")}
              </span>
            )}
            {listing.listing_expires_at && !isExpired && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {t("page.c2c.expires_on")} {new Date(listing.listing_expires_at).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </motion.div>

        {listing.description && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">{t("page.c2c.description")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </motion.div>
        )}

        {listing.category && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{listing.category.replace(/^c2c_/, "").replace(/_/g, " ")}</span>
            {listing.status === "sold" && (
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="h-3 w-3" /> {t("page.c2c.sold")}
              </span>
            )}
          </motion.div>
        )}

        {provider && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <SellerProfileCard providerId={provider.id} />
          </motion.div>
        )}
      </div>

      {provider?.user_id && listing.status !== "sold" && !isExpired && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-safe">
          <div className="max-w-lg mx-auto">
            <ContactSellerButton
              listingId={listing.id}
              listingTitle={listing.title}
              sellerUserId={provider.user_id}
              sellerName={provider.display_name || t("page.c2c.seller_label")}
            />
          </div>
        </div>
      )}
    </SubPageShell>
  );
}
