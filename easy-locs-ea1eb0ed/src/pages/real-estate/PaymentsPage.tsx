import { useState } from "react";
import { useLeases, useRentPayments } from "@/hooks/useRealEstate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useUiEngine } from "@/hooks/useUiEngine";

const statusIcon: Record<string, { icon: typeof CheckCircle; cls: string }> = {
  paid: { icon: CheckCircle, cls: "text-emerald-600" },
  pending: { icon: Clock, cls: "text-amber-600" },
  overdue: { icon: AlertTriangle, cls: "text-destructive" },
};

export default function PaymentsPage() {
  useUiEngine("real-estate-paymentspage");
  const { data: leases, isLoading: leasesLoading } = useLeases();
  const [selectedLease, setSelectedLease] = useState<string>("");
  const { data: payments, isLoading: paymentsLoading } = useRentPayments(selectedLease || undefined);

  const loading = leasesLoading || (!!selectedLease && paymentsLoading);

  return (
    <div className="space-y-4">
      <Select value={selectedLease} onValueChange={setSelectedLease}>
        <SelectTrigger className="bg-card border-border/50">
          <SelectValue placeholder="Select a lease" />
        </SelectTrigger>
        <SelectContent>
          {leases?.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {(l.tenants as any)?.name || "Tenant"} — {(l.properties as any)?.label || "Property"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedLease && (
        <div className="text-center py-16">
          <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Select a lease to view rent payments.</p>
        </div>
      )}

      {loading && <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {selectedLease && !paymentsLoading && payments?.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No payments recorded for this lease.</p>
        </div>
      )}

      <div className="grid gap-3">
        {payments?.map((p) => {
          const st = statusIcon[p.status ?? "pending"] || statusIcon.pending;
          const Icon = st.icon;
          return (
            <Card key={p.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${st.cls}`} />
                  <div>
                    <p className="text-sm font-medium">
                      {p.due_date ? format(new Date(p.due_date), "MMM yyyy") : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {p.due_date ? format(new Date(p.due_date), "dd/MM/yyyy") : "—"}
                      {p.paid_at && ` · Paid ${format(new Date(p.paid_at), "dd/MM/yyyy")}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="text-sm font-bold">{p.amount} {p.currency}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
