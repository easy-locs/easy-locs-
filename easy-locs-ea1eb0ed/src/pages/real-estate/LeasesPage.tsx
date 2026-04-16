import { useState } from "react";
import { useLeases } from "@/hooks/useRealEstate";
import { Input } from "@/components/ui/input";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Search, KeyRound, Calendar, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useUiEngine } from "@/hooks/useUiEngine";

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  draft: "bg-muted text-muted-foreground border-border",
  pending_signature: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  signed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  archived: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function LeasesPage() {
  useUiEngine("real-estate-leasespage");
  const [search, setSearch] = useState("");
  const { data: leases, isLoading, error } = useLeases(search || undefined);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search leases…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/50" />
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}

      {error && <div className="text-center py-12 text-destructive"><p className="text-sm">Failed to load leases</p></div>}

      {!isLoading && !error && leases?.length === 0 && (
        <div className="text-center py-16">
          <KeyRound className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No leases yet.</p>
        </div>
      )}

      <div className="grid gap-3">
        {leases?.map((l) => (
          <Link key={l.id} to={`/real-estate/lease/${l.id}`}>
            <AppCard className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[0.625rem] capitalize border ${statusColor[l.status] || statusColor.draft}`}>
                        {l.status?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{l.lease_type}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{(l.tenants as any)?.name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span>{(l.properties as any)?.label || "—"}, {(l.properties as any)?.city || ""}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {l.start_date ? format(new Date(l.start_date), "dd/MM/yyyy") : "—"}
                        {" → "}
                        {l.end_date ? format(new Date(l.end_date), "dd/MM/yyyy") : "ongoing"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-primary">{l.rent_amount}€</span>
                    <span className="block text-[0.625rem] text-muted-foreground">+{l.charges_amount}€</span>
                  </div>
                </div>
              </CardContent>
            </AppCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
