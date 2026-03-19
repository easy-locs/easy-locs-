import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { retryDispatch } from "@/lib/dispatch/dispatch-engine";
import { validateDelivery } from "@/lib/dispatch/delivery-validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import { Truck, RefreshCw, MapPin, Clock, User, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MerchantDeliveryMonitorPage() {
  const { user } = useAuth();
  const [merchantProfileId, setMerchantProfileId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("merchant_onboarding_profiles").select("id").eq("user_id", user.id).limit(1).maybeSingle()
      .then(({ data }: any) => { if (data) setMerchantProfileId(data.id); });
  }, [user?.id]);

  const loadJobs = useCallback(async () => {
    if (!merchantProfileId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("dispatch_jobs_v2")
      .select("*")
      .eq("merchant_profile_id", merchantProfileId)
      .order("created_at", { ascending: false })
      .limit(30);
    setJobs(data ?? []);
    setLoading(false);
  }, [merchantProfileId]);

  useEffect(() => {
    if (!merchantProfileId) return;
    loadJobs();
    const ch = supabase.channel(`merch-dispatch:${merchantProfileId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "dispatch_jobs_v2",
        filter: `merchant_profile_id=eq.${merchantProfileId}`,
      }, loadJobs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [merchantProfileId, loadJobs]);

  const selectJob = async (job: any) => {
    setSelectedJob(job);
    const { data } = await (supabase as any)
      .from("driver_mission_offers").select("*")
      .eq("dispatch_job_id", job.id).order("ranking_score", { ascending: false });
    setOffers(data ?? []);
  };

  const handleRetry = async (jobId: string) => {
    try {
      const r = await retryDispatch(jobId);
      toast.success(`Retry: ${r.mode}`);
      loadJobs();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleMerchantConfirm = async (job: any) => {
    try {
      await validateDelivery({
        orderId: job.order_id,
        dispatchJobId: job.id,
        method: "merchant_confirm",
        actorUserId: user?.id,
      });
      toast.success("Delivery confirmed");
      loadJobs();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-5 h-5" /> Delivery Monitor
        </h1>
        <Button variant="outline" size="sm" onClick={loadJobs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {jobs.map(job => (
        <Card
          key={job.id}
          className={`cursor-pointer transition-colors ${selectedJob?.id === job.id ? "border-primary" : ""}`}
          onClick={() => selectJob(job)}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{job.dispatch_status}</Badge>
              <span className="font-medium">{formatMoney(Number(job.delivery_fee ?? 0), job.currency)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {Number(job.distance_km ?? 0).toFixed(1)} km</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{job.estimated_duration_min} min</span>
              {job.assigned_driver_id && <span className="flex items-center gap-1"><User className="w-3 h-3" /> Driver assigned</span>}
              <span>Retry: {job.retry_count}</span>
            </div>

            {/* No driver warning */}
            {["expired", "open", "broadcasted"].includes(job.dispatch_status) && job.retry_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" /> No driver found
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {["open", "broadcasted", "expired"].includes(job.dispatch_status) && (
                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); handleRetry(job.id); }}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              )}
              {job.dispatch_status === "delivered" && (
                <Button size="sm" onClick={e => { e.stopPropagation(); handleMerchantConfirm(job); }}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Confirm Delivery
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!loading && !jobs.length && (
        <p className="text-center text-muted-foreground py-8">No delivery jobs</p>
      )}

      {/* Selected job detail: offers */}
      {selectedJob && offers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Driver Offers ({offers.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {offers.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between text-sm p-2 border rounded">
                <Badge variant="outline">{o.offer_status}</Badge>
                <span className="text-xs text-muted-foreground">Score: {Number(o.ranking_score ?? 0).toFixed(0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
