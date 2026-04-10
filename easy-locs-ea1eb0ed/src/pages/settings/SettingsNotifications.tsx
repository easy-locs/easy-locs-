/**
 * SettingsNotifications — Standalone notifications settings page
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import NotificationPreferences from "@/components/communication/NotificationPreferences";

export default function SettingsNotifications() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">{t("page.settings.notifications") || "Notifications"}</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2">
        <NotificationPreferences />
      </div>
    </div>
  );
}
