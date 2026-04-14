import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function NotificationCenterPage() {
  useUiEngine("notifications-notificationcenterpage");
  return <NotificationCenter />;
}
