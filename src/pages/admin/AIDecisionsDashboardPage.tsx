import React from "react";
import { useAutonomousEngine } from "@/hooks/useAutonomousEngine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Zap, AlertTriangle, CheckCircle, TrendingUp, Wallet, MessageCircle, ShoppingBag } from "lucide-react";

const priorityColor: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground",
};

const typeIcon: Record<string, React.ReactNode> = {
  ux_fix: <AlertTriangle className="h-4 w-4" />,
  payment_boost: <TrendingUp className="h-4 w-4" />,
  lead_inject: <Zap className="h-4 w-4" />,
  wallet_activate: <Wallet className="h-4 w-4" />,
  orbit_engage: <MessageCircle className="h-4 w-4" />,
  marketplace_improve: <ShoppingBag className="h-4 w-4" />,
  event_activate: <Zap className="h-4 w-4" />,
  revenue_boost: <TrendingUp className="h-4 w-4" />,
};

export default function AIDecisionsDashboardPage() {
  const { report, businessState, running } = useAutonomousEngine();
  const dr = businessState?.decisionResult;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Decision Engine</h1>
          <p className="text-xs text-muted-foreground">
            {running ? "Analyzing..." : `${dr?.decisions.length ?? 0} decisions · ${dr?.executed.length ?? 0} auto-executed`}
          </p>
        </div>
      </div>

      {/* Score Cards */}
      {report && (
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard title="Overall" value={report.scores.overallHealth} icon={<Brain className="h-4 w-4" />} />
          <ScoreCard title="UX Quality" value={report.scores.uxQuality} icon={<AlertTriangle className="h-4 w-4" />} />
          <ScoreCard title="Payment" value={report.scores.paymentConversion} icon={<TrendingUp className="h-4 w-4" />} />
          <ScoreCard title="Leads" value={report.scores.leadConversion} icon={<Zap className="h-4 w-4" />} />
          <ScoreCard title="Wallet" value={report.scores.walletUsage} icon={<Wallet className="h-4 w-4" />} />
          <ScoreCard title="Orbit" value={report.scores.orbitEngagement} icon={<MessageCircle className="h-4 w-4" />} />
        </div>
      )}

      {/* Active Campaigns */}
      {businessState && businessState.activeCampaigns.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businessState.activeCampaigns.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.eventName}</p>
                  <p className="text-xs text-muted-foreground">{c.country}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Live</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Wallet Incentives */}
      {businessState && businessState.walletIncentives.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Wallet Incentives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businessState.walletIncentives.map(w => (
              <div key={w.id} className="p-2 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-foreground">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decisions List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">All Decisions ({dr?.decisions.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dr?.decisions.map(d => (
            <div key={d.id} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1.5">
              <div className="flex items-center gap-2">
                {typeIcon[d.type] ?? <Zap className="h-4 w-4" />}
                <span className="text-sm font-medium text-foreground flex-1">{d.reason}</span>
                <Badge className={`text-[10px] ${priorityColor[d.priority]}`}>{d.priority}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{d.expectedImpact}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Impact: {d.impactScore}
                </Badge>
                {dr.executed.some(e => e.id === d.id) ? (
                  <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" /> Executed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Flagged</Badge>
                )}
              </div>
            </div>
          ))}

          {(!dr || dr.decisions.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No decisions generated yet</p>
          )}
        </CardContent>
      </Card>

      {/* Marketplace Flags */}
      {businessState && businessState.marketplaceFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Marketplace Improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businessState.marketplaceFlags.map(f => (
              <div key={f.id} className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-foreground capitalize">{f.issue.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{f.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  const color = value >= 80 ? "text-green-400" : value >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-muted/50">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={`text-lg font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
