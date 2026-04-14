/**
 * SettingsSecurity — Standalone security settings page
 */
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import MFASettings from "@/components/settings/MFASettings";
import PinManagement from "@/components/security/PinManagement";
import AppSecuritySettings from "@/components/security/AppSecuritySettings";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function SettingsSecurity() {
  useUiEngine("settings-security");
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <SubPageShell title={t("page.settings.security") || "Security"} onBack={() => navigate("/settings")} contentClassName="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold mb-3">MFA</h2>
        <MFASettings />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold mb-3">PIN</h2>
        <PinManagement />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold mb-3">{t("page.settings.app_security") || "App Security"}</h2>
        <AppSecuritySettings />
      </div>
    </SubPageShell>
  );
}
