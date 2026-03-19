import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/currency";
import { Truck, MapPin, User, Clock, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  broadcasted: "bg-yellow-100 text-yellow-800",
  assigned: "bg-green-100 text-green-800",
  accepted: "bg-green-200 text-green-900",
  picked_up: "bg-purple-100 text-purple-800",
  in_progress: "bg-purple-200 text-purple-900",
  delivered: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export default function AdminDispatchDiagnosticsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    let query = (supabase as any).from("dispatch_jobs").select("*").order("created_at", { ascending: false }).limit(50);
    if (searchOrder) query = query.eq("order_id", searchOrder);
    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  };

  const loadOffers = async (jobId: string) => {
    const { data } = await (supabase as any).from("dispatch_offers").select("*").eq("job_id", jobId).order("score", { ascending: false });
    setOffers(data ?? []);
    setSelectedJobId(jobId);
  };

  useEffect(() => { loadJobs(); }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-6 h-6" /> Dispatch Diagnostics
        </h1>
        <Button variant="outline" size="sm" onClick={loadJobs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search by order ID..." value={searchOrder} onChange={e => setSearchOrder(e.target.value)} className="max-w-sm" />
        <Button onClick={loadJobs}>Search</Button>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Dispatch Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="detail">Job Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-3 mt-4">
          {jobs.map(job => (
            <Card key={job.id} className="cursor-pointer hover:border-primary/50" onClick={() => loadOffers(job.id)}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[job.status] ?? ""}>{job.status}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{job.id?.slice(0, 8)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.distance_km?.toFixed(1)} km</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{job.estimated_duration_min} min</span>
                    <span>{formatMoney(job.quoted_fee ?? 0, job.currency)}</span>
                  </div>
                </div>
                <div className="text-right text-xs space-y-1">
                  {job.assigned_driver_id && (
                    <div className="flex items-center gap-1 text-green-600"><User className="w-3 h-3" /> {job.assigned_driver_id.slice(0, 8)}</div>
                  )}
                  <div className="text-muted-foreground">Retry: {job.retry_count ?? 0}</div>
                  {job.order_id && <div className="text-muted-foreground font-mono">Order: {job.order_id.slice(0, 8)}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
          {!jobs.length && <p className="text-muted-foreground text-center py-8">No dispatch jobs found</p>}
        </TabsContent>

        <TabsContent value="detail" className="space-y-4 mt-4">
          {selectedJobId ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-lg">Driver Offers / Rankings</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {offers.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={o.offer_status === "accepted" ? "default" : "secondary"}>{o.offer_status}</Badge>
                        <span className="font-mono text-xs">{o.driver_user_id?.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span>Score: {o.score?.toFixed(1)}</span>
                        <span>ETA: {o.eta_minutes}min</span>
                        <span>{o.distance_km?.toFixed(1)}km</span>
                      </div>
                    </div>
                  ))}
                  {!offers.length && <p className="text-muted-foreground">No offers for this job</p>}
                </CardContent>
              </Card>

              {/* Ranking explanation from snapshot */}
              {(() => {
                const job = jobs.find(j => j.id === selectedJobId);
                const snapshot = job?.ranking_snapshot;
                if (!snapshot?.candidates) return null;
                return (
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Ranking Snapshot</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">Top score: {snapshot.topScore?.toFixed(2)}</p>
                      {snapshot.candidates?.map((c: any, i: number) => (
                        <div key={i} className="text-xs text-muted-foreground border-b pb-1">
                          #{i + 1} — Score: {c.score} | {c.rankExplanation}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a job to see details</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
