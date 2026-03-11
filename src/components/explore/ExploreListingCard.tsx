import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Eye, Users, Moon, CheckCircle, Bed, Bath, Maximize } from "lucide-react";
import { getSubcategoryInfo } from "@/lib/category-hierarchy";
import { useI18n } from "@/lib/i18n";

const PLACEHOLDER_IMG = "/placeholder.svg";

export function ExploreListingCard({ item }: { item: any }) {
  const { t } = useI18n();
  const type = item._type as string;

  const href = type === "seasonal"
    ? (item.slug ? `/listing/${item.slug}` : "/explore")
    : type === "real-estate"
    ? (item.slug ? `/properties/${item.slug}` : "/explore")
    : (item.booking_slug ? `/book/${item.booking_slug}` : "/explore");

  const imgSrc = type === "seasonal"
    ? (item.cover_url || PLACEHOLDER_IMG)
    : (Array.isArray(item.photo_urls) && item.photo_urls[0] ? item.photo_urls[0] : PLACEHOLDER_IMG);

  const priceLabel = type === "seasonal"
    ? `${item.price_per_night}€ / ${t("explore.night") || "night"}`
    : type === "real-estate"
    ? `${Number(item.price || 0).toLocaleString()} ${item.currency || "€"}${item.listing_type === "long_term_rent" ? `/${t("explore.mo") || "mo"}` : ""}`
    : item.price > 0 ? `${item.price} ${item.currency || "€"}` : (t("explore.free") || "Free");

  const subInfo = getSubcategoryInfo(type === "service" ? item.category : type === "seasonal" ? "seasonal" : "real-estate");

  const typeBadge = type === "seasonal"
    ? { label: t("explore.vacation_rental") || "Vacation Rental", color: "bg-warning/10 text-warning border-warning/20" }
    : type === "real-estate"
    ? { label: item.listing_type === "sale" ? (t("explore.for_sale") || "For Sale") : (t("explore.long_term") || "Long-term Rent"), color: "bg-info/10 text-info border-info/20" }
    : { label: subInfo?.label || item.category?.replace(/_/g, " ") || (t("explore.service") || "Service"), color: "bg-success/10 text-success border-success/20" };

  const isVerified = type === "service" && Array.isArray(item.badges) && item.badges.includes("verified");
  const ctaLabel = type === "service"
    ? (t("explore.book_now") || "Book now")
    : type === "real-estate"
    ? (t("explore.view_property") || "View property")
    : (t("explore.view_and_book") || "View & book");

  return (
    <Link to={href} className="group block h-full">
      <div className="h-full rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:border-accent/30 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img src={imgSrc} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute top-3 start-3 flex items-center gap-1.5 flex-wrap max-w-[calc(100%-24px)]">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-sm whitespace-nowrap ${typeBadge.color}`}>
              {subInfo?.emoji && <span>{subInfo.emoji}</span>}
              {typeBadge.label}
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-accent/90 text-accent-foreground backdrop-blur-sm whitespace-nowrap">
                <CheckCircle className="h-3 w-3" /> {t("mp.verified") || "Verified"}
              </span>
            )}
          </div>
          <div className="absolute bottom-3 end-3 bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-sm font-bold text-foreground whitespace-nowrap">{priceLabel}</span>
          </div>
          {type === "real-estate" && item.views_count > 0 && (
            <div className="absolute top-3 end-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> {item.views_count}
            </div>
          )}

          {Array.isArray(item.photo_urls) && item.photo_urls.length > 1 && (
            <div className="absolute bottom-3 start-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-muted-foreground font-medium">
              1/{item.photo_urls.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-1.5 min-h-[120px]">
          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <MapPin className="h-3 w-3 shrink-0 text-accent/70" />
            <span className="truncate">
              {item.city}
              {item.country ? `, ${item.country.toUpperCase().slice(0, 3)}` : ""}
            </span>
          </div>
          {type === "service" && subInfo && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{subInfo.emoji}</span>
              <span className="font-medium truncate">{subInfo.label}</span>
            </div>
          )}
          {type === "seasonal" && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.max_guests && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.max_guests}</span>}
              {item.min_nights && <span className="flex items-center gap-1"><Moon className="h-3 w-3" />min {item.min_nights}{t("explore.n") || "n"}</span>}
            </div>
          )}
          {type === "real-estate" && (
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
              {item.surface_sqm > 0 && (
                <span className="flex items-center gap-1 whitespace-nowrap"><Maximize className="h-3 w-3" /> {item.surface_sqm} m²</span>
              )}
              {item.rooms > 0 && (
                <span className="whitespace-nowrap">{item.rooms} {t("explore.rooms") || "rooms"}</span>
              )}
              {item.bedrooms > 0 && (
                <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {item.bedrooms}</span>
              )}
              {item.bathrooms > 0 && (
                <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {item.bathrooms}</span>
              )}
            </div>
          )}
          <div className="pt-2 mt-auto">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:gap-2.5 transition-all px-3 py-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/15 whitespace-nowrap">
              {ctaLabel} <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
