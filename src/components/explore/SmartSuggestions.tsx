import { memo } from "react";
import { Link } from "react-router-dom";
import { Sparkles, MapPin, ArrowRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const PLACEHOLDER = "/placeholder.svg";

interface SuggestionItem {
  id: string;
  title: string;
  city?: string;
  country?: string;
  photo_url?: string;
  price?: number;
  currency?: string;
  href: string;
}

/** Shows "Similar Listings" based on current context */
const SmartSuggestions = memo(function SmartSuggestions({
  items,
  title = "Similar listings you might like",
}: {
  items: SuggestionItem[];
  title?: string;
}) {
  if (!items.length) return null;

  const fmtPrice = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
    } catch { return `${amount} ${currency}`; }
  };

  return (
    <div className="py-6">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent" /> {title}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.slice(0, 8).map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className="shrink-0 w-40 rounded-xl border border-border/40 bg-card overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <OptimizedImage
                src={item.photo_url || PLACEHOLDER}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                width={160}
              />
            </div>
            <div className="p-2">
              <h4 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                {item.title}
              </h4>
              {(item.city || item.country) && (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {[item.city, item.country].filter(Boolean).join(", ")}
                </p>
              )}
              {item.price && item.currency && (
                <p className="text-xs font-bold text-foreground mt-1">{fmtPrice(item.price, item.currency)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

export default SmartSuggestions;
