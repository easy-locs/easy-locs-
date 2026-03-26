/**
 * DriverJobMarketplace — ZZZ. Internal job marketplace for drivers.
 * Available missions, bidding, zone/type/pay filters.
 * PASS96-ZZZ
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, MapPin, DollarSign, Clock, Filter, Loader2,
  ChevronRight, Zap, Star, Truck, ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  className?: string;
}

interface AvailableJob {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  package_description: string | null;
  delivery_fee: number | null;
  currency: string | null;
  priority: string;
  weight_kg: number | null;
  created_at: string | null;
  org_id: string;
}

type SortBy = "fee_desc" | "fee_asc" | "newest" | "priority";

export default function DriverJobMarketplace({ className }: Props) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [minFee, setMinFee] = useState<number>(0);
  const [bidding, setBidding] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mobility_jobs")
        .select("id, pickup_address, dropoff_address, package_description, delivery_fee, currency, priority, weight_kg, created_at, org_id")
        .eq("status", "pending")
        .is("driver_id", null)
        .order("created_at", { ascending: false })
        .limit(100);
      setJobs((data as AvailableJob[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    let result = jobs.filter(j => {
      if (search && !j.pickup_address.toLowerCase().includes(search.toLowerCase()) &&
        !j.dropoff_address.toLowerCase().includes(search.toLowerCase()) &&
        !(j.package_description || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== "all" && j.priority !== priorityFilter) return false;
      if (minFee > 0 && (j.delivery_fee || 0) < minFee) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "fee_desc") return (b.delivery_fee || 0) - (a.delivery_fee || 0);
      if (sortBy === "fee_asc") return (a.delivery_fee || 0) - (b.delivery_fee || 0);
      if (sortBy === "priority") {
        const prio = { urgent: 3, express: 2, standard: 1 };
        return (prio[b.priority as keyof typeof prio] || 0) - (prio[a.priority as keyof typeof prio] || 0);
      }
      return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
    });

    return result;
  }, [jobs, search, sortBy, priorityFilter, minFee]);

  const acceptJob = async (jobId: string) => {
    if (!user) return;
    haptic("success");
    const { error } = await supabase.from("delivery_offers").insert({
      job_id: jobId, driver_id: user.id, status: "pending",
      proposed_fee: bidAmount ? parseFloat(bidAmount) : null,
      message: bidAmount ? `Proposition: ${bidAmount}€` : null,
    });
    if (error) { toast.error("Erreur"); return; }
    toast.success("🎯 Candidature envoyée !");
    setBidding(null);
    setBidAmount("");
  };

  const PRIORITY_BADGES = {
    urgent: { label: "🔴 Urgent", bg: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" },
    express: { label: "🟠 Express", bg: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" },
    standard: { label: "🟢 Standard", bg: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" },
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} /></div>;
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Missions disponibles</h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par adresse…" className="h-8 text-xs"
          style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }} />

        <div className="flex gap-1 overflow-x-auto">
          {(["all", "urgent", "express", "standard"] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className="text-[9px] px-2.5 py-1 rounded-full font-medium shrink-0"
              style={{
                background: priorityFilter === p ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
                color: priorityFilter === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              {p === "all" ? "Tout" : p === "urgent" ? "🔴 Urgent" : p === "express" ? "🟠 Express" : "🟢 Standard"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 flex-1">
            <DollarSign className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
            <Input type="number" value={minFee || ""} onChange={e => setMinFee(+e.target.value)}
              placeholder="Min €" className="h-7 text-[10px] w-20"
              style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
            className="h-7 text-[10px] px-2 rounded-md"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }}>
            <option value="newest">Plus récent</option>
            <option value="fee_desc">€ Décroissant</option>
            <option value="fee_asc">€ Croissant</option>
            <option value="priority">Priorité</option>
          </select>
        </div>
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <Package className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune mission disponible</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const badge = PRIORITY_BADGES[job.priority as keyof typeof PRIORITY_BADGES] || PRIORITY_BADGES.standard;
            const isBidding = bidding === job.id;
            return (
              <motion.div key={job.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl overflow-hidden"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        {job.weight_kg && (
                          <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{job.weight_kg}kg</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] flex items-center gap-1" style={{ color: "hsl(var(--hud-text))" }}>
                          <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--success))" }} />
                          <span className="truncate">{job.pickup_address}</span>
                        </p>
                        <p className="text-[10px] flex items-center gap-1" style={{ color: "hsl(var(--hud-text))" }}>
                          <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--destructive))" }} />
                          <span className="truncate">{job.dropoff_address}</span>
                        </p>
                      </div>
                      {job.package_description && (
                        <p className="text-[9px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          📦 {job.package_description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-black" style={{ color: "hsl(var(--success))" }}>
                        {(job.delivery_fee || 0).toFixed(2)}€
                      </p>
                      <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        {job.created_at ? new Date(job.created_at).toLocaleDateString("fr") : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-[10px] h-8" onClick={() => acceptJob(job.id)}
                      style={{ background: "hsl(var(--success))", color: "#fff" }}>
                      <Zap className="h-3 w-3 mr-1" /> Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-8 px-3"
                      onClick={() => { setBidding(isBidding ? null : job.id); haptic("light"); }}
                      style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-cyan))" }}>
                      💰 Enchérir
                    </Button>
                  </div>
                </div>

                {/* Bid panel */}
                <AnimatePresence>
                  {isBidding && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 flex gap-2">
                        <Input type="number" step="0.5" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                          placeholder="Votre prix (€)" className="h-8 text-xs flex-1"
                          style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                        <Button size="sm" className="h-8 text-[10px]" onClick={() => acceptJob(job.id)}
                          disabled={!bidAmount}
                          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                          Envoyer
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
