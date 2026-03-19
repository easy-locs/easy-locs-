/**
 * SettingsAddresses — Standalone addresses settings page
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function SettingsAddresses() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">{t("page.settings.address") || "Addresses"}</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2">
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <p className="text-sm text-muted-foreground">
            {t("page.settings.address_desc") || "Manage your saved delivery and billing addresses"}
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Home</p>
                <p className="text-xs text-muted-foreground truncate">No address saved yet</p>
              </div>
            </div>
            <div className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Work</p>
                <p className="text-xs text-muted-foreground truncate">No address saved yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
