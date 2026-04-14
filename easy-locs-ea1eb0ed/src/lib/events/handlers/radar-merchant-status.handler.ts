/**
 * Radar Merchant Status Handler
 * Listens to merchant.online / merchant.offline events from the platform bus
 * and updates the radar store's merchant status map in real-time.
 * This drives pin updates and live online/offline badges in the radar results.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { useRadarStore } from "@/stores/radarStore";

function handleMerchantOnline(payload: Record<string, unknown>) {
  const merchantId = (payload?.merchantId || payload?.id) as string | undefined;
  if (!merchantId) return;
  if (import.meta.env.DEV) console.log(`[radar-merchant-status] ${merchantId} → online`);
  useRadarStore.getState().setMerchantStatus(merchantId, true);
}

function handleMerchantOffline(payload: Record<string, unknown>) {
  const merchantId = (payload?.merchantId || payload?.id) as string | undefined;
  if (!merchantId) return;
  if (import.meta.env.DEV) console.log(`[radar-merchant-status] ${merchantId} → offline`);
  useRadarStore.getState().setMerchantStatus(merchantId, false);
}

platformBus.on("merchant:online", (event) => handleMerchantOnline(event.payload as Record<string, unknown>));
platformBus.on("merchant:offline", (event) => handleMerchantOffline(event.payload as Record<string, unknown>));
