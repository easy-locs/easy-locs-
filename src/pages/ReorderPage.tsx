import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listOrderItems } from "@/lib/reorder/reorderEngine";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

export default function ReorderPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;

    const run = async () => {
      if (!orderId) return;

      try {
        const { data: order, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();

        if (error) throw error;
        if (!order) throw new Error("Order not found");

        const items = await listOrderItems(orderId);

        for (const item of items) {
          addItem(
            {
              id: (order as any).merchant_id,
              name: (order as any).merchant_name || "Merchant",
              image: null,
            },
            {
              menuItemId: (item as any).menu_item_id ?? item.id,
              name: (item as any).item_name || (item as any).name || "Item",
              description: (item as any).notes ?? null,
              imageUrl: null,
              unitPrice: Number((item as any).unit_price ?? (item as any).price ?? 0),
            }
          );
        }

        if (live) {
          setDone(true);
          toast.success("Order loaded into cart");
          navigate("/checkout");
        }
      } catch (err: any) {
        toast.error(err.message || "Could not reorder");
      } finally {
        if (live) setLoading(false);
      }
    };

    run();
    return () => {
      live = false;
    };
  }, [orderId]);

  return (
    <div className="app-mobile-page flex items-center justify-center bg-background">
      {loading && <p className="text-sm text-muted-foreground">Preparing reorder...</p>}
      {!loading && !done && <p className="text-sm text-destructive">Could not prepare reorder.</p>}
    </div>
  );
}
