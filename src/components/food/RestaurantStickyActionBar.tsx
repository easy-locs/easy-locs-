import { useNavigate } from "react-router-dom";

type RestaurantStickyActionBarProps = {
  itemCount: number;
  total: number;
  restaurantId?: string | null;
};

export function RestaurantStickyActionBar({
  itemCount,
  total,
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
              <div className="text-sm font-bold">View Cart</div>
              <div className="text-[11px] opacity-80">
                {itemCount} item{itemCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="text-sm font-bold">{total.toFixed(2)} AED</div>
          </div>
        </button>
      </div>
    </div>
  );
}
