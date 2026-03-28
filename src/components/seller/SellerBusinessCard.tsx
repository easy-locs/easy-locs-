/**
 * SellerBusinessCard — Card for each business in Seller Dashboard.
 * Full lifecycle: onboarding_draft | draft | pending | ready | active | paused | archived
 */
import { Building2, Edit, ExternalLink, Share2, MapPin, ChefHat, QrCode, Pause, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/system";
import { cleanUiText } from "@/lib/text-format";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { BusinessStatus } from "@/lib/seller/businessLifecycle";
import { validateBusinessReadiness, type BusinessRequirement } from "@/lib/seller/businessLifecycle";

interface SellerBusinessCardProps {
  id: string;
  name: string;
  category?: string;
  address?: string;
  photo_url?: string | null;
  status: BusinessStatus;
  editPath?: string;
  viewPath?: string;
  slug?: string;
  requirements?: BusinessRequirement[];
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
  slug,
  requirements,
}: SellerBusinessCardProps) {
  const navigate = useNavigate();

  const statusMap: Record<string, { variant: "success" | "warning" | "neutral" | "info" | "destructive"; label: string }> = {
    active: { variant: "success", label: "Active" },
    ready: { variant: "info", label: "Ready" },
    pending: { variant: "warning", label: "Pending Review" },
    draft: { variant: "neutral", label: "Draft" },
    onboarding_draft: { variant: "info", label: "Setting Up" },
    paused: { variant: "warning", label: "Paused" },
    archived: { variant: "destructive", label: "Archived" },
  };

  const st = statusMap[status] ?? statusMap.draft;
  const missingReqs = requirements?.filter((r) => !r.met) ?? [];

  const handleShare = async () => {
    if (!viewPath) {
      toast.info("Complete setup to share your listing");
      return;
    }
    const url = `${window.location.origin}${viewPath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {}
  };

  return (
    <div className="flex gap-3 p-3 rounded-2xl bg-card border border-border/30 transition-all active:scale-[0.98]">
      <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
        {photo_url ? (
          <img src={photo_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="w-8 h-8" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground min-w-0 break-words leading-snug">{cleanUiText(name)}</h3>
            <StatusChip label={st.label} variant={st.variant as any} size="sm" />
          </div>
          {category && (
            <p className="text-xs text-muted-foreground mt-0.5 min-w-0 break-words leading-snug">{cleanUiText(category)}</p>
          )}
          {address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0 break-words leading-snug">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {cleanUiText(address)}
            </p>
          )}
          {missingReqs.length > 0 && status !== "active" && (
            <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              Missing: {missingReqs.map((r) => r.label).join(", ")}
            </p>
          )}
        </div>

        <div className="flex gap-1.5 mt-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-lg active:scale-[0.97]"
            onClick={() => navigate(editPath || `/my-shop/${id}`)}
          >
            <Edit className="w-3 h-3 mr-1" />
            {status === "onboarding_draft" ? "Continue Setup" : "Edit"}
          </Button>

          {status === "active" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg active:scale-[0.97]"
                onClick={() => navigate(`/pos/${id}`)}
              >
                <ChefHat className="w-3 h-3 mr-1" /> POS
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-lg active:scale-[0.97]"
                onClick={() => navigate(`/qr/shop/${slug || id}`)}
              >
                <QrCode className="w-3 h-3" />
              </Button>
            </>
          )}

          {viewPath && status === "active" && (
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
