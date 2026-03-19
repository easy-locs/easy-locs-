import { captureDemandEvent } from "@/lib/growth/demand-capture";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PublicStorefrontGrowthBanner(props: {
  storefrontPageId?: string;
  merchantProfileId?: string;
  city?: string;
  countryCode?: string;
  vertical?: "food" | "hotel" | "retail" | "services";
}) {
  async function handleInterest() {
    try {
      await captureDemandEvent({
        storefrontPageId: props.storefrontPageId,
        merchantProfileId: props.merchantProfileId,
        city: props.city,
        countryCode: props.countryCode,
        vertical: props.vertical,
        eventType: "coming_soon_interest",
      });
      toast.success("We'll notify you when this merchant goes live!");
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
      <p className="text-sm font-semibold text-foreground">Coming soon on Easy-Locs</p>
      <p className="text-xs text-muted-foreground">
        This merchant can activate instantly and start receiving orders.
      </p>
      <Button size="sm" variant="secondary" onClick={handleInterest}>
        Notify me when it goes live
      </Button>
    </div>
  );
}
