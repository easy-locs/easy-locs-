import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { OverlayType, NavigationContext } from "@/lib/navigation/navigation-intent";
import { setReturnOrigin } from "@/lib/navigation/return-origin";
import WalletQuickSheet from "./WalletQuickSheet";
import OrbitQuickSheet from "./OrbitQuickSheet";
import MeQuickSheet from "./MeQuickSheet";
import { haptic } from "@/lib/haptics";

interface Props {
  activeOverlay: OverlayType | null;
  overlayRoute: string | null;
  overlayContext?: NavigationContext | null;
  onClose: () => void;
}

function PillarOverlayHost({ activeOverlay, overlayRoute, overlayContext, onClose }: Props) {
  const navigate = useNavigate();

  const handleGoFull = useCallback(() => {
    onClose();
    if (overlayRoute) {
      haptic("medium");
      setReturnOrigin(window.location.pathname);
      setTimeout(() => navigate(overlayRoute), 150);
    }
  }, [overlayRoute, onClose, navigate]);

  return (
    <>
      <WalletQuickSheet
        open={activeOverlay === "wallet"}
        onOpenChange={(open) => { if (!open) onClose(); }}
        onGoFull={handleGoFull}
        entityContext={activeOverlay === "wallet" ? overlayContext : undefined}
      />
      <OrbitQuickSheet
        open={activeOverlay === "orbit"}
        onOpenChange={(open) => { if (!open) onClose(); }}
        onGoFull={handleGoFull}
        entityContext={activeOverlay === "orbit" ? overlayContext : undefined}
      />
      <MeQuickSheet
        open={activeOverlay === "me"}
        onOpenChange={(open) => { if (!open) onClose(); }}
        onGoFull={handleGoFull}
      />
    </>
  );
}

export default memo(PillarOverlayHost);
