/**
 * DealAnalyticsPage — Deal conversion metrics & funnel
 * PASS55 Block 9d
 */
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DealAnalyticsDashboard from "@/components/deals/DealAnalyticsDashboard";
import { useI18n } from "@/lib/i18n";

export default function DealAnalyticsPage() {
  const { t } = useI18n();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">
          {t("deals.analytics_title") || "Deal Analytics"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("deals.analytics_desc") || "Conversion metrics, funnel analysis, and deal performance."}
        </p>
        <DealAnalyticsDashboard />
      </div>
    </DashboardLayout>
  );
}
