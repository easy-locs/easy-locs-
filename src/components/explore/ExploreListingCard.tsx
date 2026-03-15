import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, Users, Moon, CheckCircle, Bed, Bath, Maximize, Lock } from "lucide-react";
import { getSubcategoryInfo } from "@/lib/category-hierarchy";
import { useI18n } from "@/lib/i18n";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import SaveButton from "@/components/explore/SaveButton";
import { useSavedListings } from "@/hooks/useSavedListings";
import { buildAppUrl } from "@/lib/app-domain";
import { useAuth } from "@/contexts/AuthContext";

const PLACEHOLDER_IMG = "/placeholder.svg";

export const ExploreListingCard = memo(function ExploreListingCard({ item }: { item: any }) {
  const { t } = useI18n();
  const { isSaved, toggleSave } = useSavedListings();
  const { user } = useAuth();
  const type = item._type as string;

  const href = type === "seasonal"
    ? (item.slug ? `/listing/${item.slug}` : "/explore")
    : type === "real-estate"
    ? (item.slug ? `/properties/${item.slug}` : "/explore")
    : (item.booking_slug ? `/book/${item.booking_slug}` : "/explore");

  const imgSrc = type === "seasonal"
    ? (item.cover_url || PLACEHOLDER_IMG)
    : (Array.isArray(item.photo_urls) && item.photo_urls[0] ? item.photo_urls[0] : PLACEHOLDER_IMG);

  const currCode = item.currency || "EUR";
  const fmtPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    } catch { return `${amount} ${currCode}`; }
  };
  const pricePeriodSuffix = item.price_type === "per_hour" ? "/h" : item.price_type === "per_day" ? `/${t("explore.day") || "day"}` : item.price_type === "per_week" ? `/${t("explore.week") || "wk"}` : item.price_type === "per_month" ? `/${t("explore.mo") || "mo"}` : "";
  const priceLabel = type === "seasonal"
    ? `${fmtPrice(item.price_per_night)} / ${t("explore.night") || "night"}`
    : type === "real-estate"
    ? `${fmtPrice(item.price || 0)}${item.listing_type === "long_term_rent" ? `/${t("explore.mo") || "mo"}` : ""}`
    : item.price > 0 ? `${fmtPrice(item.price)}${pricePeriodSuffix}` : (t("explore.free") || "Free");

  const subInfo = getSubcategoryInfo(type === "service" ? item.category : type === "seasonal" ? "seasonal" : "real-estate");

  const isMarketplaceSaleOrRental = type === "service" && (item.listing_type === "sale" || item.listing_type === "rental");
  const typeBadge = type === "seasonal"
    ? { label: t("explore.vacation_rental") || "Vacation Rental", color: "bg-warning/15 text-warning border-warning/25" }
    : type === "real-estate"
    ? { label: item.listing_type === "sale" ? (t("explore.for_sale") || "For Sale") : (t("explore.long_term") || "Long-term"), color: "bg-info/15 text-info border-info/25" }
    : isMarketplaceSaleOrRental
    ? { label: item.listing_type === "sale" ? (t("explore.for_sale") || "For Sale") : (t("explore.rental") || "Rental"), color: "bg-info/15 text-info border-info/25" }
    : { label: subInfo?.label || item.category?.replace(/_/g, " ") || (t("explore.service") || "Service"), color: "bg-success/15 text-success border-success/25" };

  const isVerified = type === "service" && Array.isArray(item.badges) && item.badges.includes("verified");
  const ctaLabel = type === "service"
    ? (t("explore.book_now") || "Book now")
    : type === "real-estate"
    ? (t("explore.view_property") || "View")
    : (t("explore.view_and_book") || "View & book");

  const fmtCity = (s: string) => s ? s.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") : "";
  const fmtCountry = (s: string) => {
    if (!s) return "";
    return s.length <= 3 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1);
  };
  const locationText = [fmtCity(item.city), fmtCountry(item.country)].filter(Boolean).join(", ");

  return (
    <Link to={href} className="group block h-full">
      <div className="h-full rounded-2xl overflow-hidden bg-card border border-border/40 hover:shadow-lg hover:border-accent/25 transition-all duration-300">
        {/* Image with watermark */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <OptimizedImage src={imgSrc} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" width={400} />
          
          {/* Transparent Easy-Locs watermark */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-white/10 text-2xl sm:text-3xl font-black tracking-widest select-none rotate-[-15deg]">
              EASY-LOCS
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5 z-10">
            <SaveButton
              isSaved={isSaved(type, item.id)}
              onToggle={() => toggleSave({
                type, id: item.id, title: item.title,
                image: type === "seasonal" ? item.cover_url : item.photo_urls?.[0],
                city: item.city, country: item.country,
                price: item.price || item.price_per_night, currency: item.currency,
              })}
            />
          </div>

          <div className="absolute top-2.5 left-2.5 flex items-start gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-token-xs font-semibold border backdrop-blur-md ${typeBadge.color}`}>
              {subInfo?.emoji && <span className="text-xs">{subInfo.emoji}</span>}
              <span className="truncate max-w-[120px]">{typeBadge.label}</span>
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-token-xs font-semibold bg-accent/90 text-accent-foreground backdrop-blur-md">
                <CheckCircle className="h-3 w-3" /> {t("mp.verified") || "Verified"}
              </span>
            )}
          </div>

          {Array.isArray(item.photo_urls) && item.photo_urls.length > 1 && (
            <div className="absolute bottom-2.5 left-2.5 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-2xs text-muted-foreground font-medium">
              1/{item.photo_urls.length}
            </div>
          )}
        </div>

        {/* Content — price under image, not on it */}
        <div className="p-3 sm:p-3.5 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-accent transition-colors flex-1 min-w-0">
              {item.title}
            </h3>
            <span className="text-sm font-bold text-foreground whitespace-nowrap shrink-0">{priceLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-accent/70" />
            <span className="line-clamp-1">{locationText || "—"}</span>
          </div>

          {type === "seasonal" && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.max_guests > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.max_guests} {t("explore.guests") || "guests"}</span>}
              {item.min_nights > 0 && <span className="flex items-center gap-1"><Moon className="h-3 w-3" />min {item.min_nights} {t("explore.nights") || "nights"}</span>}
            </div>
          )}
          {(type === "real-estate" || isMarketplaceSaleOrRental) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {item.surface_sqm > 0 && (
                <span className="flex items-center gap-0.5 whitespace-nowrap"><Maximize className="h-3 w-3" /> {item.surface_sqm}m²</span>
              )}
              {item.bedrooms > 0 && (
                <span className="flex items-center gap-0.5 whitespace-nowrap"><Bed className="h-3 w-3" /> {item.bedrooms}</span>
              )}
              {item.bathrooms > 0 && (
                <span className="flex items-center gap-0.5 whitespace-nowrap"><Bath className="h-3 w-3" /> {item.bathrooms}</span>
              )}
              {item.brand && (
                <span className="flex items-center gap-0.5 whitespace-nowrap text-muted-foreground">{item.brand} {item.model || ""}</span>
              )}
            </div>
          )}

          {/* CTA — no contact icons on card (require login on detail page) */}
          <div className="pt-1.5 mt-auto flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:gap-2 transition-all px-2.5 py-1.5 rounded-lg bg-accent/8 group-hover:bg-accent/15 whitespace-nowrap">
              {ctaLabel} <ArrowRight className="h-3 w-3" />
            </span>
            {!user && (
              <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("explore.login_to_contact") || "Login to contact"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});
