/**
 * Growth Engine Page — Feature flags + growth domination cockpit.
 */
import { usePlatformFlags } from "@/hooks/usePlatformFlags";
import { useState, useEffect } from "react";
import { getGrowthReport } from "@/lib/growth/growth-domination-engine";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Rocket, Target, Globe, Mail, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminGrowthEnginePage() {
  const { flags, loading, toggle, refresh } = usePlatformFlags();
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const r = await getGrowthReport();
      setReport(r);
    } catch (e) {
      console.error("Growth report error:", e);
    }
    setReportLoading(false);
  };

  useEffect(() => { void loadReport(); }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Growth & Domination Engine</h1>
            <p className="text-xs text-muted-foreground">Feature flags + autonomous growth</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Feature Flags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Platform Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{flag.key}</span>
                  <Badge variant={flag.enabled ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {flag.enabled ? "ON" : "OFF"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
              </div>
              <Switch checked={flag.enabled} onCheckedChange={(v) => toggle(flag.key, v)} className="shrink-0 ml-3" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Growth Report */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Growth Report
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadReport} disabled={reportLoading}>
              <RefreshCw className={`w-3 h-3 mr-1 ${reportLoading ? "animate-spin" : ""}`} />
              Scan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Mail className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold text-foreground">{report.invitationCandidates}</div>
                <div className="text-[10px] text-muted-foreground">Invite Ready</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Globe className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold text-foreground">{report.seoPages}</div>
                <div className="text-[10px] text-muted-foreground">SEO Pages</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold text-foreground">{report.marketOpportunities}</div>
                <div className="text-[10px] text-muted-foreground">Opportunities</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Loading growth data...</p>
          )}

          {report?.topOpportunities?.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Top Opportunities</h3>
              {report.topOpportunities.map((opp: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-foreground">{opp.city}, {opp.country}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{opp.entityCount} entities</span>
                    <Badge variant={opp.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">
                      {opp.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
