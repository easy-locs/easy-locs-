import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Eye, Users, Moon, CheckCircle } from "lucide-react";
import { getSubcategoryInfo } from "@/lib/category-hierarchy";

const PLACEHOLDER_IMG = "/placeholder.svg";

export function ExploreListingCard({ item }: { item: any }) {
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
    ? `${item.price_per_night}€ / night`
    : type === "real-estate"
    ? `${Number(item.price || 0).toLocaleString()} ${item.currency || "€"}${item.listing_type === "long_term_rent" ? "/mo" : ""}`
    : item.price > 0 ? `${item.price} ${item.currency || "€"}` : "Free";

  const subInfo = getSubcategoryInfo(type === "service" ? item.category : type === "seasonal" ? "seasonal" : "real-estate");

  const typeBadge = type === "seasonal"
    ? { label: "Vacation Rental", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" }
    : type === "real-estate"
    ? { label: item.listing_type === "sale" ? "For Sale" : "Long-term Rent", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" }
    : { label: subInfo?.label || item.category?.replace(/_/g, " ") || "Service", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };

  const isVerified = type === "service" && Array.isArray(item.badges) && item.badges.includes("verified");
  const ctaLabel = type === "service" ? "Book now" : type === "real-estate" ? "View property" : "View & book";

  return (
    <Link to={href} className="group block h-full">
      <div className="h-full rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:border-accent/30 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img src={imgSrc} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${typeBadge.color}`}>
              {subInfo?.emoji && <span>{subInfo.emoji}</span>}
              {typeBadge.label}
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-accent/90 text-accent-foreground backdrop-blur-sm">
                <CheckCircle className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-sm font-bold text-foreground">{priceLabel}</span>
          </div>
          {type === "real-estate" && item.views_count > 0 && (
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> {item.views_count}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-1.5 min-h-[130px]">
          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-accent/70" />
            <span className="truncate">{item.city}{item.country ? `, ${item.country.toUpperCase()}` : ""}</span>
          </div>
          {type === "service" && subInfo && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{subInfo.emoji}</span>
              <span className="font-medium">{subInfo.label}</span>
            </div>
          )}
          {type === "seasonal" && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.max_guests && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.max_guests} guests</span>}
              {item.min_nights && <span className="flex items-center gap-1"><Moon className="h-3 w-3" />min {item.min_nights}n</span>}
            </div>
          )}
          {type === "real-estate" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {item.surface_sqm > 0 && <span>{item.surface_sqm} m²</span>}
              {item.rooms > 0 && <span>• {item.rooms} rooms</span>}
              {item.bedrooms > 0 && <span>• {item.bedrooms} bed</span>}
            </div>
          )}
          <div className="pt-2 mt-auto">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:gap-2.5 transition-all px-3 py-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/15">
              {ctaLabel} <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
