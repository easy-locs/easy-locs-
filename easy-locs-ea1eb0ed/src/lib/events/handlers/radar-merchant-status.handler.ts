/**
 * Radar Merchant Status Handler
 * Listens to merchant.online / merchant.offline events from the platform bus
 * and updates the radar store's merchant status map in real-time.
 * This drives pin updates and live online/offline badges in the radar results.
 */
import { eventBus } from "@/lib/core/event-bus";
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

eventBus.on("merchant.online", handleMerchantOnline);
eventBus.on("merchant.offline", handleMerchantOffline);
