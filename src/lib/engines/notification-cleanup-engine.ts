/**
 * Notification Cleanup Engine — Archives old notifications.
 * Canonical: reads/writes notifications table.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ARCHIVE_DAYS = 90;

export async function runNotificationCleanup(limit = 200) {
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 86400_000).toISOString();

  // Archive old read notifications
  const { data: old } = await db
    .from("notifications")
    .select("id")
    .not("read_at", "is", null)
    .lt("created_at", cutoff)
    .or("is_archived.is.null,is_archived.eq.false")
    .limit(limit);

  let archived = 0;
  if (old?.length) {
    const ids = old.map((n: any) => n.id);
    await db.from("notifications").update({ is_archived: true }).in("id", ids);
    archived = ids.length;
  }

  return { archived, checked: old?.length ?? 0 };
}
