import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function CustomerShareCartPage() {
  useUiEngine("customer-customersharecartpage");
  const navigate = useNavigate();
  const { cart } = useCart();

  const share = async () => {
    const payload = {
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      items: cart.items.map((item: any) => ({
        name: item.name,
        qty: item.quantity,
        price: item.unitPrice,
      })),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Cart copied to clipboard");
    } catch {
      toast.success("Cart share prepared");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Share Cart</h1>
          <p className="text-xs text-muted-foreground">Share your order with others</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold">{cart.restaurantName || "No merchant selected"}</div>
        <div className="text-xs text-muted-foreground">{cart.items.length} item{cart.items.length > 1 ? "s" : ""}</div>

        <div className="space-y-2">
          {cart.items.map((item: any) => (
            <div key={item.id || item.name} className="flex items-center justify-between">
              <div className="text-sm font-semibold">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.quantity} × {Number(item.unitPrice ?? 0).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <button onClick={share} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Copy Share Payload</button>
      </div>
    </div>
  );
}
