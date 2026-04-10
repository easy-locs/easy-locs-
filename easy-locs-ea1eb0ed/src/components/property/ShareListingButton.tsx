import { Share2 } from "lucide-react";
import { shareListing } from "@/lib/share/listingShare";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShareListingButton(props: { listingId: string; title: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await shareListing(props.listingId, props.title);
        if (!navigator.share) {
          toast.success("Link copied to clipboard");
        }
      }}
    >
      <Share2 className="h-4 w-4 mr-1" />
      Share
    </Button>
  );
}
