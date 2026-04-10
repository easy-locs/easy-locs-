/**
 * NotificationViewModel — Canonical view model for notification rendering.
 */

export interface NotificationViewModel {
  id: string;
  title: string;
  body: string | null;
  category: string;
  severity: string;
  icon: string | null;
  route: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  timeAgo: string;
}

export function buildNotificationVM(raw: {
  id: string;
  title: string;
  body?: string | null;
  category?: string;
  severity?: string;
  icon?: string | null;
  route?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  read_at?: string | null;
  dismissed_at?: string | null;
  created_at?: string;
}): NotificationViewModel {
  const createdAt = raw.created_at || new Date().toISOString();
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let timeAgo: string;
  if (diffMin < 1) timeAgo = "now";
  else if (diffMin < 60) timeAgo = `${diffMin}m`;
  else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}h`;
  else timeAgo = `${Math.floor(diffMin / 1440)}d`;

  return {
    id: raw.id,
    title: raw.title,
    body: raw.body || null,
    category: raw.category || "general",
    severity: raw.severity || "info",
    icon: raw.icon || null,
    route: raw.route || null,
    entityType: raw.entity_type || null,
    entityId: raw.entity_id || null,
    isRead: !!raw.read_at,
    isDismissed: !!raw.dismissed_at,
    createdAt,
    timeAgo,
  };
}
