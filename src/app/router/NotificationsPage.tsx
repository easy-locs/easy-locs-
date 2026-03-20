import { AppPageShell } from "@/components/layout/AppPageShell";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";

export default function NotificationsPage() {
  return (
    <AppPageShell title="Notifications">
      <NotificationsPanel />
    </AppPageShell>
  );
}
