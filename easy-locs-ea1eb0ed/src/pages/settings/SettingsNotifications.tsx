/**
 * SettingsNotifications — Standalone notifications settings page
 */
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import NotificationPreferences from "@/components/communication/NotificationPreferences";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function SettingsNotifications() {
  useUiEngine("settings-notifications");
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <SubPageShell title={t("page.settings.notifications") || "Notifications"} onBack={() => navigate("/settings")}>
      <NotificationPreferences />
    </SubPageShell>
  );
}
