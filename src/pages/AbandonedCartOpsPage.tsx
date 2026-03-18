import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { detectAbandonedCart, markAbandonedCartContacted } from "@/lib/marketing/abandoned-cart";
import { processAbandonedCarts } from "@/lib/marketing/abandoned-cart-worker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AbandonedCartOpsPage() {
  const [event, setEvent] = useState<any>(null);

  const detect = async () => {
    const cartId = prompt("Enter Cart ID");
    if (!cartId?.trim()) return;
    try {
      const data = await detectAbandonedCart({ cartId: cartId.trim() });
      setEvent(data);
      toast.success("Abandoned cart detected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const process = async () => {
    try {
      const results = await processAbandonedCarts();
      toast.success(`Processed ${results.length} carts`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const contact = async () => {
    if (!event) return;
    const data = await markAbandonedCartContacted(event.id);
    setEvent(data);
    toast.success("Marked as contacted");
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Abandoned Cart Ops</h1>
        <p className="text-sm text-muted-foreground">Detect and recover lost orders</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={detect} variant="outline" className="rounded-xl">Detect cart</Button>
        <Button onClick={process} variant="outline" className="rounded-xl">Process queue</Button>
        <Button onClick={contact} variant="outline" className="rounded-xl" disabled={!event}>Mark contacted</Button>
      </div>
      {event && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">ID: {event.id}</p>
          <p className="text-sm text-foreground">Subtotal: {event.subtotal} · Items: {event.item_count}</p>
          <p className="text-sm text-foreground">Status: <span className="font-bold">{event.status}</span></p>
        </div>
      )}
    </div>
  );
}
