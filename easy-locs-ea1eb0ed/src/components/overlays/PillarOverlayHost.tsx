import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { OverlayType } from "@/lib/navigation/navigation-intent";
import WalletQuickSheet from "./WalletQuickSheet";
import OrbitQuickSheet from "./OrbitQuickSheet";
import MeQuickSheet from "./MeQuickSheet";
import { haptic } from "@/lib/haptics";

interface Props {
  activeOverlay: OverlayType | null;
  overlayRoute: string | null;
  onClose: () => void;
}

function PillarOverlayHost({ activeOverlay, overlayRoute, onClose }: Props) {
  const navigate = useNavigate();

  const handleGoFull = useCallback(() => {
    onClose();
    if (overlayRoute) {
      haptic("medium");
      setTimeout(() => navigate(overlayRoute), 150);
    }
  }, [overlayRoute, onClose, navigate]);

  return (
    <>
      <WalletQuickSheet
        open={activeOverlay === "wallet"}
        onOpenChange={(open) => { if (!open) onClose(); }}
        onGoFull={handleGoFull}
      />
      <OrbitQuickSheet
        open={activeOverlay === "orbit"}
        onOpenChange={(open) => { if (!open) onClose(); }}
        onGoFull={handleGoFull}
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
