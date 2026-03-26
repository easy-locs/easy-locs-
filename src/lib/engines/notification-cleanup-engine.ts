/**
 * Notification Cleanup Engine — Archives old notifications from notifications_v2.
 * Canonical cleanup path.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ARCHIVE_DAYS = 90;

export async function runNotificationCleanup(limit = 200) {
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 86400_000).toISOString();

  // Dismiss old read notifications
  const { data: old } = await db
    .from("notifications_v2")
    .select("id")
    .not("read_at", "is", null)
    .lt("created_at", cutoff)
    .is("dismissed_at", null)
    .limit(limit);

  let archived = 0;
  if (old?.length) {
    const ids = old.map((n: any) => n.id);
    await db.from("notifications_v2").update({ dismissed_at: new Date().toISOString() }).in("id", ids);
    archived = ids.length;
  }

  return { archived, checked: old?.length ?? 0 };
}
