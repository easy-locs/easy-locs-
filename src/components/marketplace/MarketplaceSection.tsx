/**
 * MarketplaceSection — Reusable section with title, "See all" link, and horizontal scroll of cards.
 */
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import MerchantCard from "./MerchantCard";

interface MerchantItem {
  id: string;
  name: string;
  image?: string | null;
  category?: string;
  rating?: number;
  eta?: string;
  distance?: string;
  badge?: string;
  slug?: string;
}

interface MarketplaceSectionProps {
  title: string;
  seeAllPath?: string;
  items: MerchantItem[];
  basePath?: string;
  variant?: "horizontal-scroll" | "grid" | "list";
}

export default function MarketplaceSection({
  title, seeAllPath, items, basePath = "/food/restaurant", variant = "horizontal-scroll",
}: MarketplaceSectionProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {seeAllPath && (
          <button
            onClick={() => navigate(seeAllPath)}
            className="text-xs font-semibold flex items-center gap-0.5 active:opacity-70"
            style={{ color: "hsl(var(--primary))" }}
          >
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {variant === "horizontal-scroll" && (
        <div className="flex gap-3 overflow-x-auto pb-1 px-4 scrollbar-hide">
          {items.map((item, i) => (
            <div key={item.id} className="min-w-[160px] max-w-[160px]">
              <MerchantCard
                to={`${basePath}/${item.slug || item.id}`}
                image={item.image}
                name={item.name}
                category={item.category}
                rating={item.rating}
                eta={item.eta}
                badge={item.badge}
                index={i}
                variant="vertical"
              />
            </div>
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="px-4 space-y-2">
          {items.map((item, i) => (
            <MerchantCard
              key={item.id}
              to={`${basePath}/${item.slug || item.id}`}
              image={item.image}
              name={item.name}
              category={item.category}
              rating={item.rating}
              eta={item.eta}
              distance={item.distance}
              badge={item.badge}
              index={i}
              variant="horizontal"
            />
          ))}
        </div>
      )}

      {variant === "grid" && (
        <div className="grid grid-cols-2 gap-3 px-4">
          {items.map((item, i) => (
            <MerchantCard
              key={item.id}
              to={`${basePath}/${item.slug || item.id}`}
              image={item.image}
              name={item.name}
              category={item.category}
              rating={item.rating}
              eta={item.eta}
              badge={item.badge}
              index={i}
              variant="vertical"
            />
          ))}
        </div>
      )}
    </section>
  );
}
