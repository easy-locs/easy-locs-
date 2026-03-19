import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/currency";
import { retryDispatch } from "@/lib/dispatch/dispatch-engine";
import { Truck, MapPin, User, Clock, RefreshCw, AlertTriangle, CheckCircle, Target, Zap, Shield } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  broadcasted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  offered: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  assigned: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  accepted: "bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  driver_arriving_pickup: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  picked_up: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  in_progress: "bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  validated: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  self_delivery: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
};

export default function AdminDispatchDiagnosticsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [tracking, setTracking] = useState<any[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchOrder, setSearchOrder] = useState("");
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("dispatch_jobs_v2")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (searchOrder) query = query.eq("order_id", searchOrder);
    const { data } = await query;
    setJobs(data ?? []);
    setLoading(false);
  };

  const selectJob = async (job: any) => {
    setSelectedJob(job);

    // Load offers, tracking, and splits in parallel
    const [offersRes, trackingRes, splitsRes] = await Promise.all([
      (supabase as any)
        .from("driver_mission_offers")
        .select("*")
        .eq("dispatch_job_id", job.id)
        .order("ranking_score", { ascending: false }),
      (supabase as any)
        .from("driver_live_locations")
        .select("*")
        .eq("dispatch_job_id", job.id)
        .order("recorded_at", { ascending: false })
        .limit(20),
      job.order_id
        ? (supabase as any)
            .from("wallet_order_splits")
            .select("*")
            .eq("order_id", job.order_id)
        : Promise.resolve({ data: [] }),
    ]);

    setOffers(offersRes.data ?? []);
    setTracking(trackingRes.data ?? []);
    setSplits(splitsRes.data ?? []);
  };

  const handleRetry = async (jobId: string) => {
    try {
      const result = await retryDispatch(jobId);
      toast.success(`Retry result: ${result.mode}`);
      loadJobs();
    } catch (e: any) {
      toast.error(e.message);
    }
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
        <Input
          placeholder="Search by order ID..."
          value={searchOrder}
          onChange={e => setSearchOrder(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={loadJobs}>Search</Button>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="splits">Splits</TabsTrigger>
        </TabsList>

        {/* Jobs list */}
        <TabsContent value="jobs" className="space-y-3 mt-4">
          {jobs.map(job => (
            <Card
              key={job.id}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${selectedJob?.id === job.id ? "border-primary" : ""}`}
              onClick={() => selectJob(job)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[job.dispatch_status] ?? ""}>{job.dispatch_status}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{job.id?.slice(0, 8)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {Number(job.distance_km ?? 0).toFixed(1)} km</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{job.estimated_duration_min} min</span>
                    <span>{formatMoney(Number(job.delivery_fee ?? 0), job.currency)}</span>
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

        {/* Job detail */}
        <TabsContent value="detail" className="space-y-4 mt-4">
          {selectedJob ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5" /> Job Detail</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[selectedJob.dispatch_status] ?? ""}>{selectedJob.dispatch_status}</Badge></div>
                    <div><span className="text-muted-foreground">Currency:</span> {selectedJob.currency}</div>
                    <div><span className="text-muted-foreground">Fee:</span> {formatMoney(Number(selectedJob.delivery_fee ?? 0), selectedJob.currency)}</div>
                    <div><span className="text-muted-foreground">Distance:</span> {Number(selectedJob.distance_km ?? 0).toFixed(1)} km</div>
                    <div><span className="text-muted-foreground">ETA:</span> ~{selectedJob.estimated_duration_min} min</div>
                    <div><span className="text-muted-foreground">Retries:</span> {selectedJob.retry_count}</div>
                    <div><span className="text-muted-foreground">Country:</span> {selectedJob.country_code}</div>
                    <div><span className="text-muted-foreground">City:</span> {selectedJob.city ?? "—"}</div>
                  </div>

                  {/* Timestamps */}
                  <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
                    <div>Created: {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleString() : "—"}</div>
                    <div>Assigned: {selectedJob.assigned_at ? new Date(selectedJob.assigned_at).toLocaleString() : "—"}</div>
                    <div>Picked up: {selectedJob.picked_up_at ? new Date(selectedJob.picked_up_at).toLocaleString() : "—"}</div>
                    <div>Delivered: {selectedJob.delivered_at ? new Date(selectedJob.delivered_at).toLocaleString() : "—"}</div>
                    <div>Validated: {selectedJob.validated_at ? new Date(selectedJob.validated_at).toLocaleString() : "—"}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {["open", "broadcasted", "expired"].includes(selectedJob.dispatch_status) && (
                      <Button size="sm" variant="outline" onClick={() => handleRetry(selectedJob.id)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry Dispatch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking snapshot */}
              {selectedJob.ranking_snapshot?.candidates?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5" /> Ranking Snapshot</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {selectedJob.ranking_snapshot.candidates.map((c: any, i: number) => (
                      <div key={i} className="text-xs border rounded p-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-mono">{c.id?.slice(0, 8)}</span>
                          <Badge variant="secondary">Score: {Number(c.score).toFixed(1)}</Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {c.distanceKm?.toFixed(1)}km • ~{c.etaMinutes}min
                        </div>
                        {c.explanation && (
                          <div className="text-muted-foreground">
                            {Object.entries(c.explanation).map(([k, v]) => `${k}:${v}`).join(" | ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a job to see details</p>
          )}
        </TabsContent>

        {/* Offers */}
        <TabsContent value="offers" className="space-y-3 mt-4">
          {selectedJob ? (
            <Card>
              <CardHeader><CardTitle className="text-lg">Driver Offers ({offers.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {offers.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={o.offer_status === "accepted" ? "default" : "secondary"}>{o.offer_status}</Badge>
                      <span className="font-mono text-xs">{o.driver_profile_id?.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span>Score: {Number(o.ranking_score ?? 0).toFixed(1)}</span>
                      {o.responded_at && <span>Responded: {new Date(o.responded_at).toLocaleTimeString()}</span>}
                    </div>
                  </div>
                ))}
                {!offers.length && <p className="text-muted-foreground text-sm">No offers for this job</p>}
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a job first</p>
          )}
        </TabsContent>

        {/* Tracking */}
        <TabsContent value="tracking" className="space-y-3 mt-4">
          {selectedJob ? (
            <Card>
              <CardHeader><CardTitle className="text-lg">Tracking Points ({tracking.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tracking.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 border rounded text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{Number(t.lat).toFixed(5)}, {Number(t.lng).toFixed(5)}</span>
                    </div>
                    <div className="text-muted-foreground flex gap-2">
                      {t.speed_kmh && <span>{Number(t.speed_kmh).toFixed(0)} km/h</span>}
                      <span>{new Date(t.recorded_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
                {!tracking.length && <p className="text-muted-foreground text-sm">No tracking data</p>}
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a job first</p>
          )}
        </TabsContent>

        {/* Splits */}
        <TabsContent value="splits" className="space-y-3 mt-4">
          {selectedJob ? (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> Wallet Splits</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {splits.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{s.split_party_type}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{s.wallet_account_id?.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatMoney(Number(s.net_amount ?? 0), selectedJob.currency)}</span>
                      <Badge variant={s.split_status === "settled" ? "default" : "secondary"}>{s.split_status}</Badge>
                    </div>
                  </div>
                ))}
                {!splits.length && <p className="text-muted-foreground text-sm">No splits found</p>}
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-8">Select a job first</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
