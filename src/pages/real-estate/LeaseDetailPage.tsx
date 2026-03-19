import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRentPayments } from "@/hooks/useRealEstate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, User, Building2, Calendar, Receipt, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function LeaseDetailPage() {
  const { leaseId } = useParams<{ leaseId: string }>();

  const { data: lease, isLoading } = useQuery({
    queryKey: ["re-lease-detail", leaseId],
    enabled: !!leaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("*, tenants:tenant_id(name, email, phone), properties:property_id(label, city, country, address)")
        .eq("id", leaseId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useRentPayments(leaseId);

  const statusIcon: Record<string, any> = {
    paid: { icon: CheckCircle, cls: "text-emerald-600" },
    pending: { icon: Clock, cls: "text-amber-600" },
    overdue: { icon: AlertTriangle, cls: "text-destructive" },
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MobilePageHeader title="Lease Details" backTo="/real-estate/leases" />

        {isLoading && <div className="space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>}

        {lease && (
          <div className="space-y-4 mt-4">
            {/* Lease overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> Lease
                  </CardTitle>
                  <Badge className="capitalize text-xs">{lease.status?.replace(/_/g, " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Tenant</p>
                    <p className="font-medium flex items-center gap-1"><User className="w-3 h-3" />{(lease.tenants as any)?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Property</p>
                    <p className="font-medium flex items-center gap-1"><Building2 className="w-3 h-3" />{(lease.properties as any)?.label || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Period</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {lease.start_date ? format(new Date(lease.start_date), "dd/MM/yyyy") : "—"}
                      {" → "}
                      {lease.end_date ? format(new Date(lease.end_date), "dd/MM/yyyy") : "ongoing"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Rent</p>
                    <p className="font-bold">{lease.rent_amount}€<span className="font-normal text-muted-foreground text-xs"> +{lease.charges_amount}€</span></p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Deposit</p>
                    <p className="font-medium">{lease.deposit_amount}€</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium capitalize">{lease.lease_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rent payments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Rent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading && <Skeleton className="h-16 rounded-lg" />}
                {!paymentsLoading && (!payments || payments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">No payments recorded.</p>
                )}
                <div className="space-y-2">
                  {payments?.map((p: any) => {
                    const st = statusIcon[p.status] || statusIcon.pending;
                    const Icon = st.icon;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${st.cls}`} />
                          <div>
                            <p className="text-sm font-medium">{p.due_date ? format(new Date(p.due_date), "MMM yyyy") : "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {p.due_date ? format(new Date(p.due_date), "dd/MM") : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold">{p.amount} {p.currency}</span>
                          <Badge variant="outline" className="text-[10px] capitalize ml-1.5">{p.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
