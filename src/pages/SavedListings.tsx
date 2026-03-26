import { useSavedListings } from "@/hooks/useSavedListings";
import { Link } from "react-router-dom";
import { Heart, MapPin, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const PLACEHOLDER_IMG = "/placeholder.svg";

export default function SavedListings() {
  const { saved, loading, toggleSave } = useSavedListings();

  const getHref = (item: any) => {
    if (item.listing_type === "seasonal") return `/listing/${item.listing_id}`;
    if (item.listing_type === "real-estate") return `/properties/${item.listing_id}`;
    return `/book/${item.listing_id}`;
  };

  const fmtPrice = (amount: number | null, currency: string | null) => {
    if (!amount) return "";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR", minimumFractionDigits: 0 }).format(amount);
    } catch { return `${amount} ${currency}`; }
  };

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead title="Saved Listings — Easy-Locs" description="Your saved listings and opportunities" />
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/explore" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 text-destructive" /> Saved Listings
            </h1>
            <p className="text-sm text-muted-foreground">{saved.length} saved</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No saved listings yet</h2>
            <p className="text-sm text-muted-foreground mb-6">Browse the marketplace and save listings you're interested in</p>
            <Link to="/explore">
              <Button>Explore listings</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {saved.map((item) => (
              <div key={item.id} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:shadow-md transition-all">
                <Link to={getHref(item)} className="flex gap-3 p-3">
                  <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                    <OptimizedImage
                      src={item.listing_image || PLACEHOLDER_IMG}
                      alt={item.listing_title || "Listing"}
                      className="w-full h-full object-cover"
                      width={96}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                      {item.listing_title || "Listing"}
                    </h3>
                    {(item.listing_city || item.listing_country) && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {[item.listing_city, item.listing_country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {item.listing_price && (
                      <p className="text-sm font-bold text-foreground mt-2">
                        {fmtPrice(item.listing_price, item.listing_currency)}
                      </p>
                    )}
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground capitalize">
                      {item.listing_type.replace(/-/g, " ")}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => toggleSave({ type: item.listing_type, id: item.listing_id })}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  aria-label="Remove from saved"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
