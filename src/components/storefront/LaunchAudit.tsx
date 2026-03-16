/**
 * LaunchAudit — Module 19: Shop launch readiness checker.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Rocket, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; }

interface CheckResult {
  label: string;
  key: string;
  passed: boolean;
  hint: string;
}

export default function LaunchAudit({ shopId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: audit, isLoading } = useQuery({
    queryKey: ["launch-audit", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("orbit_launch_audits")
        .select("*").eq("shop_id", shopId).order("checked_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const runAudit = async () => {
    if (!user) return;
    setRunning(true);
    try {
      // Check catalog
      const { data: items } = await (supabase as any).from("catalog_items").select("id").eq("shop_id", shopId).limit(1);
      const catalog_ready = (items?.length || 0) > 0;

      // Check shop config
      const { data: shop } = await (supabase as any).from("storefront_pages").select("*").eq("id", shopId).single();
      const checkout_ready = !!shop?.contact_email || !!shop?.contact_phone;
      const geo_configured = !!shop?.city && !!shop?.country;
      const share_ready = !!shop?.name && !!shop?.description;

      // Check translations
      const { data: translations } = await (supabase as any).from("storefront_translations").select("id").eq("shop_id", shopId).limit(1);
      const translation_ready = (translations?.length || 0) > 0;

      // Analytics always ready (table exists)
      const analytics_ready = true;

      const checks = [catalog_ready, checkout_ready, geo_configured, translation_ready, share_ready, analytics_ready];
      const overall_score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

      await (supabase as any).from("orbit_launch_audits").upsert({
        shop_id: shopId,
        user_id: user.id,
        catalog_ready, checkout_ready, geo_configured, translation_ready, share_ready, analytics_ready,
        overall_score,
        checked_at: new Date().toISOString(),
      }, { onConflict: "shop_id,user_id" });

      qc.invalidateQueries({ queryKey: ["launch-audit", shopId] });
      toast.success(`Launch score: ${overall_score}%`);
    } catch {
      toast.error("Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const checks: CheckResult[] = audit ? [
    { key: "catalog", label: "Catalog has items", passed: audit.catalog_ready, hint: "Add at least 1 product" },
    { key: "checkout", label: "Contact info set", passed: audit.checkout_ready, hint: "Add email or phone" },
    { key: "geo", label: "Location configured", passed: audit.geo_configured, hint: "Set city & country" },
    { key: "translation", label: "Translations added", passed: audit.translation_ready, hint: "Add at least 1 translation" },
    { key: "share", label: "Share-ready (name + desc)", passed: audit.share_ready, hint: "Add shop description" },
    { key: "analytics", label: "Analytics enabled", passed: audit.analytics_ready, hint: "Auto-enabled ✓" },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" /> Launch Readiness
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={runAudit} disabled={running}>
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {audit ? "Re-check" : "Run Audit"}
        </Button>
      </div>

      {audit && (
        <>
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Overall Score</span>
                <span className="text-lg font-bold text-foreground">{audit.overall_score}%</span>
              </div>
              <Progress value={audit.overall_score} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                Last checked: {new Date(audit.checked_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            {checks.map(c => (
              <div key={c.key} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                {c.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{c.label}</p>
                  {!c.passed && <p className="text-[10px] text-muted-foreground">{c.hint}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!audit && !isLoading && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          Run the audit to check your shop's launch readiness.
        </CardContent></Card>
      )}
    </div>
  );
}
