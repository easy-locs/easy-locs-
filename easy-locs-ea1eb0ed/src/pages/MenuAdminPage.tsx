import SubPageShell from "@/components/layout/SubPageShell";
import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { publishImportedMenuToCatalog } from "@/lib/onboarding/menu-publisher";
import { useAuth } from "@/contexts/AuthContext";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useI18n } from "@/lib/i18n";

export default function MenuAdminPage() {
  useUiEngine("menuadminpage");
  const { t } = useI18n();
  const { user, orgId } = useAuth();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const publish = async () => {
    if (!user?.id) {
      setMessage(t("page.menu_admin.login_required"));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await publishImportedMenuToCatalog({
        userId: user.id,
        workspaceId: orgId,
      });

      setMessage(
        result.importedCount > 0
          ? t("page.menu_admin.publish_result")
              .replace("{{created}}", String(result.createdCount))
              .replace("{{skipped}}", String(result.skippedCount))
          : t("page.menu_admin.no_menu")
      );
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("page.menu_admin.publish_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubPageShell noContentPad className="bg-background p-4 space-y-6">
      <BackCard label={t("page.menu_admin.back")} to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t("page.menu_admin.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("page.menu_admin.publish_desc")}</p>
      </div>

      <button
        onClick={publish}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? t("page.menu_admin.publishing") : t("page.menu_admin.publish_btn")}
      </button>

      {message && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">{message}</p>
        </div>
      )}

      {done && !message && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">{t("page.menu_admin.publish_done")}</p>
        </div>
      )}
    </SubPageShell>
  );
}
