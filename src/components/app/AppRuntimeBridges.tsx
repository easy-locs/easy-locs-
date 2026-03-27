/**
 * AppRuntimeBridges — Removed useOrbitPremiumBridge and useWalletOrbitBridge.
 * Those were duplicate cascades already handled by cross-app-reactions.ts.
 * This component is now a no-op placeholder retained for mount-point compatibility.
 */
export function AppRuntimeBridges() {
  return null;
}
