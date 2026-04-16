import { Share2 } from "lucide-react";
import { shareListing } from "@/lib/share/listingShare";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShareListingButton(props: { listingId: string; title: string; compact?: boolean }) {
  return (
    <Button
      variant="outline"
      size={props.compact ? "icon" : "sm"}
      className={props.compact ? "h-8 w-8" : undefined}
      title="Share"
      aria-label="Share listing"
      onClick={async () => {
        await shareListing(props.listingId, props.title);
        if (!navigator.share) {
          toast.success("Link copied to clipboard");
        }
      }}
    >
      <Share2 className="h-4 w-4" />
      {!props.compact && <span className="ml-1">Share</span>}
    </Button>
  );
}
