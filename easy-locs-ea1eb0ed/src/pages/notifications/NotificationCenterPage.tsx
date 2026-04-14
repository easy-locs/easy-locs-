import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function NotificationCenterPage() {
  useUiEngine("notifications-notificationcenterpage");
  return <NotificationCenter />;
}
