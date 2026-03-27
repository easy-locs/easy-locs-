import { useOrbitPremiumBridge } from "@/hooks/useOrbitPremiumBridge";
import { useWalletOrbitBridge } from "@/hooks/useWalletOrbitBridge";

export function AppRuntimeBridges() {
  useOrbitPremiumBridge();
  useWalletOrbitBridge();

  return null;
}
