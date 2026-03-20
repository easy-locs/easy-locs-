/**
 * SellerBusinessCard — Card for each business in Seller Dashboard.
 * Shows photo, name, category, address, status + edit/open/share actions.
 */
import { cn } from "@/lib/utils";
import { Building2, Edit, ExternalLink, Share2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/system";
import { cleanUiText } from "@/lib/text-format";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SellerBusinessCardProps {
  id: string;
  name: string;
  category?: string;
  address?: string;
  photo_url?: string | null;
  status: "draft" | "pending" | "active";
  editPath?: string;
  viewPath?: string;
}

export default function SellerBusinessCard({
  id,
  name,
  category,
  address,
  photo_url,
  status,
  editPath,
  viewPath,
}: SellerBusinessCardProps) {
  const navigate = useNavigate();

  const statusMap: Record<string, { variant: "success" | "warning" | "neutral"; label: string }> = {
    active: { variant: "success", label: "Active" },
    pending: { variant: "warning", label: "Pending" },
    draft: { variant: "neutral", label: "Draft" },
  };

  const st = statusMap[status] ?? statusMap.draft;

  const handleShare = async () => {
    const url = `${window.location.origin}${viewPath || `/listing/${id}`}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border/30 transition-all active:scale-[0.98]">
      {/* Photo */}
      <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
        {photo_url ? (
          <img src={photo_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{cleanUiText(name)}</h3>
            <StatusChip label={st.label} variant={st.variant} size="sm" />
          </div>
          {category && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{cleanUiText(category)}</p>
          )}
          {address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {cleanUiText(address)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-lg active:scale-[0.97]"
            onClick={() => navigate(editPath || `/dashboard/seller`)}
          >
            <Edit className="w-3 h-3 mr-1" /> Edit
          </Button>
          {viewPath && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-lg active:scale-[0.97]"
              onClick={() => navigate(viewPath)}
            >
              <ExternalLink className="w-3 h-3 mr-1" /> Open
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs rounded-lg active:scale-[0.97]"
            onClick={handleShare}
          >
            <Share2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
