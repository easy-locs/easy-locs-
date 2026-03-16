/**
 * SellerLogisticsPanel — Seller delivery management: create missions, track, assign drivers.
 * PASS70-C: Seller Logistics UI
 */
import { useState } from "react";
import DeliveryAnalyticsDashboard from "@/components/delivery/DeliveryAnalyticsDashboard";
import DeliveryDisputeFlow from "@/components/delivery/DeliveryDisputeFlow";
import BatchDispatchPanel from "@/components/delivery/BatchDispatchPanel";
import DeliveryLiveTracker from "@/components/delivery/DeliveryLiveTracker";
import ScheduledDeliveryPanel from "@/components/delivery/ScheduledDeliveryPanel";
import DeliveryHistoryExport from "@/components/delivery/DeliveryHistoryExport";
import DriverOnboardingFlow from "@/components/delivery/DriverOnboardingFlow";
import MultiStopRoutePanel from "@/components/delivery/MultiStopRoutePanel";
import SellerAnalyticsDashboard from "@/components/delivery/SellerAnalyticsDashboard";
import DriverWalletPanel from "@/components/delivery/DriverWalletPanel";
import GeofencingPanel from "@/components/delivery/GeofencingPanel";
import InMissionChat from "@/components/delivery/InMissionChat";
import AdminFleetDashboard from "@/components/delivery/AdminFleetDashboard";
import DriverReputationPanel from "@/components/delivery/DriverReputationPanel";
import RouteOptimizationEngine from "@/components/delivery/RouteOptimizationEngine";
import BuyerDeliveryDashboard from "@/components/delivery/BuyerDeliveryDashboard";
import DeliveryInvoicePanel from "@/components/delivery/DeliveryInvoicePanel";
import DeliverySLAPanel from "@/components/delivery/DeliverySLAPanel";
import MultiDropBatchPanel from "@/components/delivery/MultiDropBatchPanel";
import DriverOnboardingWizard from "@/components/delivery/DriverOnboardingWizard";
import DeliveryAnalyticsReports from "@/components/delivery/DeliveryAnalyticsReports";
import FleetManagementDashboard from "@/components/delivery/FleetManagementDashboard";
import AutomatedDispatchRules from "@/components/delivery/AutomatedDispatchRules";
import CustomerTrackingPage from "@/components/delivery/CustomerTrackingPage";
import DriverEarningsPayroll from "@/components/delivery/DriverEarningsPayroll";
import DynamicPricingSurge from "@/components/delivery/DynamicPricingSurge";
import DriverShiftScheduling from "@/components/delivery/DriverShiftScheduling";
import AdminModerationPanel from "@/components/delivery/AdminModerationPanel";
import DeliveryEventNotifications from "@/components/delivery/DeliveryEventNotifications";
import MultiCurrencyDelivery from "@/components/delivery/MultiCurrencyDelivery";
import RouteOptimizationPanel from "@/components/delivery/RouteOptimizationPanel";
import DeliveryInsurancePanel from "@/components/delivery/DeliveryInsurancePanel";
import DeliveryAdvancedAnalytics from "@/components/delivery/DeliveryAdvancedAnalytics";
import DriverReferralProgram from "@/components/delivery/DriverReferralProgram";
import DeliverySupportBot from "@/components/delivery/DeliverySupportBot";
import ReturnsReverseLogistics from "@/components/delivery/ReturnsReverseLogistics";
import DeliverySlotBooking from "@/components/delivery/DeliverySlotBooking";
import { useDeliveryNotifications } from "@/hooks/useDeliveryNotifications";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Package, Truck, MapPin, Clock, CheckCircle2,
  XCircle, ChevronRight, Users, TrendingUp, Search,
  Send, Star, AlertTriangle, MessageCircle,
} from "lucide-react";
import { useSellerDelivery, type CreateJobPayload, type NearbyDriver } from "@/hooks/useSellerDelivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  pending: { label: "En attente", emoji: "⏳", color: "hsl(var(--warning))" },
  assigned: { label: "Assigné", emoji: "📩", color: "hsl(var(--info))" },
  accepted: { label: "Accepté", emoji: "✅", color: "hsl(var(--success))" },
  in_progress: { label: "En cours", emoji: "🚗", color: "hsl(var(--hud-cyan))" },
  completed: { label: "Terminé", emoji: "🏁", color: "hsl(var(--success))" },
  cancelled: { label: "Annulé", emoji: "❌", color: "hsl(var(--destructive))" },
};

function CreateJobForm({ onSubmit, onCancel }: { onSubmit: (p: CreateJobPayload) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<CreateJobPayload>({
    pickup_address: "", dropoff_address: "", package_description: "",
    weight_kg: 1, priority: "standard", delivery_fee: 5, currency: "EUR", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.pickup_address || !form.dropoff_address) { toast.error("Adresses requises"); return; }
    setSubmitting(true);
    try { await onSubmit(form); toast.success("Mission créée !"); onCancel(); }
    catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setSubmitting(false); }
  };

  const set = (k: keyof CreateJobPayload, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
        <Plus className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Nouvelle mission
      </h3>

      <div className="space-y-2.5">
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Adresse de retrait *</Label>
          <Input value={form.pickup_address} onChange={e => set("pickup_address", e.target.value)}
            placeholder="123 Rue du Commerce, Paris"
            className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>
        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Adresse de livraison *</Label>
          <Input value={form.dropoff_address} onChange={e => set("dropoff_address", e.target.value)}
            placeholder="45 Avenue de la Liberté, Lyon"
            className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Description colis</Label>
            <Input value={form.package_description} onChange={e => set("package_description", e.target.value)}
              placeholder="Carton 30x20"
              className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Poids (kg)</Label>
            <Input type="number" value={form.weight_kg} onChange={e => set("weight_kg", +e.target.value)}
              className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Priorité</Label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)}
              className="w-full h-9 text-xs mt-1 rounded-md px-2"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))", border: "1px solid" }}>
              <option value="standard">🟢 Standard</option>
              <option value="express">🟠 Express</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Frais livraison (€)</Label>
            <Input type="number" step="0.5" value={form.delivery_fee} onChange={e => set("delivery_fee", +e.target.value)}
              className="h-9 text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Instructions spéciales…" rows={2}
            className="text-xs mt-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 text-xs h-9" onClick={handleSubmit} disabled={submitting}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Send className="h-3.5 w-3.5 mr-1" /> {submitting ? "Création…" : "Créer la mission"}
        </Button>
        <Button size="sm" variant="outline" className="text-xs h-9" onClick={onCancel}
          style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>
          Annuler
        </Button>
      </div>
    </motion.div>
  );
}

function DriverSearchPanel({ jobId, onAssign, onClose }: { jobId: string; onAssign: (driverId: string) => Promise<void>; onClose: () => void }) {
  const { findDrivers } = useSellerDelivery();
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const result = await findDrivers(jobId);
      setDrivers(result);
      setSearched(true);
      if (result.length === 0) toast("Aucun chauffeur disponible à proximité");
    } catch { toast.error("Erreur de recherche"); }
    finally { setSearching(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-2 pt-2">
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 text-xs h-8" onClick={handleSearch} disabled={searching}
          style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}>
          <Search className="h-3 w-3 mr-1" /> {searching ? "Recherche…" : "Chercher chauffeurs"}
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={onClose}
          style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>✕</Button>
      </div>

      {searched && drivers.length === 0 && (
        <p className="text-[10px] text-center py-3" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          Aucun chauffeur trouvé dans un rayon de 15 km
        </p>
      )}

      {drivers.map(d => (
        <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--info) / 0.1)" }}>
            <Truck className="h-3.5 w-3.5" style={{ color: "hsl(var(--info))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              {d.vehicle_type} • {d.distance_km} km
            </p>
            <div className="flex items-center gap-2">
              {d.avg_rating && <span className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>⭐ {d.avg_rating.toFixed(1)}</span>}
              {d.total_completed != null && <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{d.total_completed} livraisons</span>}
            </div>
          </div>
          <Button size="sm" className="text-[10px] h-7 px-3" onClick={() => onAssign(d.user_id)}
            style={{ background: "hsl(var(--success))", color: "#fff" }}>
            Assigner
          </Button>
        </div>
      ))}
    </motion.div>
  );
}

export default function SellerLogisticsPanel() {
  const { jobs, loading, metrics, createJob, assignDriver, cancelJob } = useSellerDelivery();
  useDeliveryNotifications(); // PASS81-P: activate push notifications
  const [showCreate, setShowCreate] = useState(false);
  const [searchingJobId, setSearchingJobId] = useState<string | null>(null);
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null);
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "batch" | "scheduled" | "history" | "disputes" | "analytics" | "multistop" | "seller-stats" | "onboarding" | "wallet" | "geofence" | "chat" | "fleet" | "reputation" | "optimize" | "buyer" | "invoices" | "sla" | "multi-drop" | "driver-reg" | "reports" | "fleet-mgmt" | "dispatch-rules" | "customer-track" | "payroll" | "surge" | "shifts" | "moderation" | "notif-rules" | "multi-currency" | "route-optim" | "insurance" | "adv-analytics">("all");
  const [chatJobId, setChatJobId] = useState<string | null>(null);

  const filteredJobs = jobs.filter(j => {
    if (filter === "active") return ["pending", "assigned", "accepted", "in_progress"].includes(j.status);
    if (filter === "completed") return ["completed", "cancelled"].includes(j.status);
    return true;
  });

  const handleAssign = async (jobId: string, driverId: string) => {
    haptic("medium");
    try { await assignDriver(jobId, driverId); toast.success("Chauffeur assigné !"); setSearchingJobId(null); }
    catch { toast.error("Erreur d'assignation"); }
  };

  const handleCancel = async (jobId: string) => {
    haptic("warning");
    try { await cancelJob(jobId, "seller_cancelled"); toast("Mission annulée"); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Actives", value: metrics.active, color: "--hud-cyan" },
          { label: "Terminées", value: metrics.completed, color: "--success" },
          { label: "Dépenses", value: `${metrics.totalSpent.toFixed(0)}€`, color: "--warning" },
          { label: "Moy.", value: `${metrics.avgFee.toFixed(1)}€`, color: "--info" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl px-2 py-2.5 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Create button */}
      <AnimatePresence mode="wait">
        {showCreate ? (
          <CreateJobForm
            key="form"
            onSubmit={createJob}
            onCancel={() => setShowCreate(false)}
          />
        ) : (
          <motion.div key="btn">
            <Button
              className="w-full text-xs h-10 font-semibold"
              onClick={() => { setShowCreate(true); haptic("light"); }}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Créer une mission de livraison
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "hsl(var(--hud-surface))" }}>
        {(["all", "active", "completed", "batch", "multi-drop", "multistop", "scheduled", "history", "disputes", "analytics", "reports", "adv-analytics", "seller-stats", "sla", "surge", "multi-currency", "route-optim", "insurance", "onboarding", "driver-reg", "shifts", "wallet", "geofence", "fleet", "fleet-mgmt", "dispatch-rules", "moderation", "reputation", "optimize", "buyer", "customer-track", "invoices", "payroll", "notif-rules"] as const).map(f => {
          const labels: Record<string, string> = {
            all: "Tout", active: "Actives", completed: "Terminées", batch: "⚡ Batch",
            "multi-drop": "📦 Multi-Drop",
            multistop: "🗺️ Multi", scheduled: "📅 Planif.", history: "📋 Histo.",
            disputes: "⚠️ Litiges", analytics: "📊 Stats", reports: "📈 Rapports", "seller-stats": "📈 Perf.",
            sla: "⏱️ SLA", surge: "💹 Surge", onboarding: "🚗 Livreur", "driver-reg": "📝 Inscription",
            shifts: "📅 Shifts", wallet: "💰 Wallet", geofence: "🛡️ Zones", fleet: "🏢 Flotte",
            "fleet-mgmt": "🗺️ Fleet", "dispatch-rules": "⚙️ Dispatch", moderation: "🛡️ Modération",
            "customer-track": "📲 Suivi client", payroll: "💶 Paie", "notif-rules": "🔔 Notifs",
            reputation: "🏆 Réputation", optimize: "⚡ Optim.", buyer: "👤 Client", invoices: "🧾 Factures",
            "multi-currency": "💱 Devises", "route-optim": "🧭 Routes", insurance: "🛡️ Assurance", "adv-analytics": "📊 Analytics+",
          };
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="shrink-0 py-1.5 px-2 rounded-lg text-[9px] font-semibold transition-all"
              style={{
                background: filter === f ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
                color: filter === f ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              }}>
              {labels[f] || f}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filter === "analytics" ? (
        <DeliveryAnalyticsDashboard orgId={jobs[0]?.org_id} />
      ) : filter === "seller-stats" ? (
        <SellerAnalyticsDashboard orgId={jobs[0]?.org_id || ""} />
      ) : filter === "multistop" ? (
        <MultiStopRoutePanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "onboarding" ? (
        <DriverOnboardingFlow onComplete={() => setFilter("all")} />
      ) : filter === "disputes" ? (
        <DeliveryDisputeFlow orgId={jobs[0]?.org_id || ""} />
      ) : filter === "batch" ? (
        <BatchDispatchPanel jobs={jobs} onDone={() => setFilter("all")} />
      ) : filter === "scheduled" ? (
        <ScheduledDeliveryPanel onDone={() => setFilter("all")} />
      ) : filter === "history" ? (
        <DeliveryHistoryExport jobs={jobs} loading={loading} />
      ) : filter === "wallet" ? (
        <DriverWalletPanel />
      ) : filter === "geofence" ? (
        <GeofencingPanel />
      ) : filter === "fleet" ? (
        <AdminFleetDashboard orgId={jobs[0]?.org_id || ""} />
      ) : filter === "reputation" ? (
        <DriverReputationPanel />
      ) : filter === "optimize" ? (
        <RouteOptimizationEngine orgId={jobs[0]?.org_id || ""} />
      ) : filter === "buyer" ? (
        <BuyerDeliveryDashboard />
      ) : filter === "invoices" ? (
        <DeliveryInvoicePanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "sla" ? (
        <DeliverySLAPanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "multi-drop" ? (
        <MultiDropBatchPanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "driver-reg" ? (
        <DriverOnboardingWizard onComplete={() => setFilter("all")} />
      ) : filter === "reports" ? (
        <DeliveryAnalyticsReports orgId={jobs[0]?.org_id || ""} />
      ) : filter === "fleet-mgmt" ? (
        <FleetManagementDashboard orgId={jobs[0]?.org_id || ""} />
      ) : filter === "dispatch-rules" ? (
        <AutomatedDispatchRules orgId={jobs[0]?.org_id || ""} />
      ) : filter === "customer-track" ? (
        <CustomerTrackingPage />
      ) : filter === "payroll" ? (
        <DriverEarningsPayroll />
      ) : filter === "surge" ? (
        <DynamicPricingSurge orgId={jobs[0]?.org_id || ""} />
      ) : filter === "shifts" ? (
        <DriverShiftScheduling orgId={jobs[0]?.org_id || ""} />
      ) : filter === "moderation" ? (
        <AdminModerationPanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "notif-rules" ? (
        <DeliveryEventNotifications orgId={jobs[0]?.org_id || ""} />
      ) : filter === "multi-currency" ? (
        <MultiCurrencyDelivery orgId={jobs[0]?.org_id || ""} />
      ) : filter === "route-optim" ? (
        <RouteOptimizationPanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "insurance" ? (
        <DeliveryInsurancePanel orgId={jobs[0]?.org_id || ""} />
      ) : filter === "adv-analytics" ? (
        <DeliveryAdvancedAnalytics orgId={jobs[0]?.org_id || ""} />
      ) : (
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Package className="h-6 w-6 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Truck className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune mission</p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const cfg = STATUS_LABELS[job.status] || STATUS_LABELS.pending;
            return (
              <div key={job.id} className="rounded-xl overflow-hidden"
                style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-base">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {job.package_description || "Colis"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        {job.created_at ? new Date(job.created_at).toLocaleDateString("fr") : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {job.status === "pending" && (
                      <Button size="sm" className="text-[10px] h-7 px-2"
                        onClick={() => setSearchingJobId(searchingJobId === job.id ? null : job.id)}
                        style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
                        <Users className="h-3 w-3 mr-0.5" /> Assigner
                      </Button>
                    )}
                    {["assigned", "accepted", "in_progress"].includes(job.status) && (
                      <Button size="sm" className="text-[10px] h-7 px-2"
                        onClick={() => setTrackingJobId(trackingJobId === job.id ? null : job.id)}
                        style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
                        <MapPin className="h-3 w-3 mr-0.5" /> GPS
                      </Button>
                    )}
                    {["assigned", "accepted", "in_progress"].includes(job.status) && job.driver_id && (
                      <Button size="sm" className="text-[10px] h-7 px-2"
                        onClick={() => setChatJobId(chatJobId === job.id ? null : job.id)}
                        style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
                        <MessageCircle className="h-3 w-3 mr-0.5" /> Chat
                      </Button>
                    )}
                    {["pending", "assigned"].includes(job.status) && (
                      <Button size="sm" variant="ghost" className="text-[10px] h-7 px-1.5"
                        onClick={() => handleCancel(job.id)}
                        style={{ color: "hsl(var(--destructive) / 0.6)" }}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                    {["completed", "cancelled"].includes(job.status) && (
                      <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2"
                        onClick={() => setDisputeJobId(disputeJobId === job.id ? null : job.id)}
                        style={{ color: "hsl(var(--destructive) / 0.6)" }}>
                        <AlertTriangle className="h-3 w-3 mr-0.5" /> Litige
                      </Button>
                    )}
                    {job.delivery_fee != null && (
                      <span className="text-[10px] font-bold ml-1" style={{ color: "hsl(var(--hud-cyan))" }}>
                        {job.delivery_fee.toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>

                {/* Driver search panel */}
                <AnimatePresence>
                  {searchingJobId === job.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-3">
                        <DriverSearchPanel
                          jobId={job.id}
                          onAssign={(driverId) => handleAssign(job.id, driverId)}
                          onClose={() => setSearchingJobId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dispute panel */}
                <AnimatePresence>
                  {disputeJobId === job.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-3">
                        <DeliveryDisputeFlow
                          orgId={job.org_id}
                          jobId={job.id}
                          onClose={() => setDisputeJobId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live GPS tracking panel */}
                <AnimatePresence>
                  {trackingJobId === job.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-3">
                        <DeliveryLiveTracker
                          jobId={job.id}
                          onClose={() => setTrackingJobId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* In-mission chat */}
                <AnimatePresence>
                  {chatJobId === job.id && job.driver_id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-3">
                        <InMissionChat
                          jobId={job.id}
                          sellerId={job.seller_id}
                          driverId={job.driver_id}
                          onClose={() => setChatJobId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
      )}
    </div>
  );
}
