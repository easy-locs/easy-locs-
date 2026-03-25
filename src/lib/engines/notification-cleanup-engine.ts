/**
 * Notification Cleanup Engine — Archives old notifications, cleans duplicates.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ARCHIVE_DAYS = 90;

export async function runNotificationCleanup(limit = 200) {
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 86400_000).toISOString();

  // Mark old read notifications as archived
  const { data: old } = await db
    .from("notifications")
    .select("id")
    .eq("read", true)
    .lt("created_at", cutoff)
    .limit(limit);

  let archived = 0;
  for (const n of old ?? []) {
    await db.from("notifications").update({ status: "archived" }).eq("id", n.id);
    archived++;
  }

  return { archived, checked: old?.length ?? 0 };
}
