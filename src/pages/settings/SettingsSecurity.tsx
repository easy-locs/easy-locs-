/**
 * SettingsSecurity — Standalone security settings page
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import MFASettings from "@/components/settings/MFASettings";
import PinManagement from "@/components/security/PinManagement";
import AppSecuritySettings from "@/components/security/AppSecuritySettings";

export default function SettingsSecurity() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">{t("page.settings.security") || "Security"}</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2 space-y-3">
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-bold mb-3">MFA</h2>
          <MFASettings />
        </div>
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-bold mb-3">PIN</h2>
          <PinManagement />
        </div>
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-bold mb-3">{t("page.settings.app_security") || "App Security"}</h2>
          <AppSecuritySettings />
        </div>
      </div>
    </div>
  );
}
