import { db as supabase } from "@/services/db";

type DayHours = {
  open?: string;
  close?: string;
  enabled?: boolean;
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getDayKey(date = new Date()) {
  return DAY_KEYS[date.getDay()];
}

function parseMinutes(value?: string) {
  if (!value || !value.includes(":")) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function isMerchantOpenNow(
  openingHours: Record<string, DayHours> | null | undefined,
  now = new Date()
) {
  if (!openingHours) return { open: true, reason: "No opening hours configured" };

  const key = getDayKey(now);
  const row = openingHours[key];
  if (!row) return { open: false, reason: "Closed today" };
  if (row.enabled === false) return { open: false, reason: "Closed today" };

  const openMins = parseMinutes(row.open);
  const closeMins = parseMinutes(row.close);
  if (openMins == null || closeMins == null) return { open: true, reason: "Hours incomplete" };

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const open = nowMins >= openMins && nowMins <= closeMins;

  return {
    open,
    reason: open ? `Open until ${row.close}` : `Closed · opens ${row.open}`,
  };
}

export async function getMerchantAvailability(merchantId: string) {
  const { data, error } = await supabase
    .from("seed_merchants")
    .select("id,name,is_open,opening_hours")
    .eq("id", merchantId)
    .maybeSingle();

  if (error) throw error;
  const hours = (data as any)?.opening_hours ?? null;
  const computed = isMerchantOpenNow(hours);

  return { merchant: data, computed };
}

export async function setMerchantOpenFlag(params: {
  merchantId: string;
  isOpen: boolean;
}) {
  const { data, error } = await supabase
    .from("seed_merchants")
    .update({
      is_open: params.isOpen,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.merchantId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
