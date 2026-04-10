import { useCanonicalUnreadBridge } from "@/hooks/useCanonicalUnreadBridge";
import { useCanonicalNotificationsBridge } from "@/hooks/useCanonicalNotificationsBridge";
import { useCanonicalWalletBridge } from "@/hooks/useCanonicalWalletBridge";
import { useCanonicalMeBridge } from "@/hooks/useCanonicalMeBridge";

export function CanonicalAppBridges() {
  useCanonicalUnreadBridge();
  useCanonicalNotificationsBridge();
  useCanonicalWalletBridge();
  useCanonicalMeBridge();

  return null;
}
