import { useNavigate } from "react-router-dom";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { tc } from "@/lib/i18n-canonical";

type RestaurantStickyActionBarProps = {
  itemCount: number;
  total: number;
  currency?: string;
  restaurantId?: string | null;
};

export function RestaurantStickyActionBar({
  itemCount,
  total,
  currency,
  restaurantId,
}: RestaurantStickyActionBarProps) {
  const navigate = useNavigate();

  if (!restaurantId || itemCount <= 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          onClick={() => navigate("/checkout")}
          className="w-full rounded-[22px] bg-primary text-primary-foreground px-5 py-4 shadow-lg active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-bold">{tc("commerce.cart")}</div>
              <div className="text-[11px] opacity-80">
                {tc(itemCount > 1 ? "commerce.items" : "commerce.item", { count: itemCount })}
              </div>
            </div>
            <div className="text-sm font-bold">{formatMoneyByCountry(total, null, currency)}</div>
          </div>
        </button>
      </div>
    </div>
  );
}
