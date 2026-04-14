import { useParams, Link } from "react-router-dom";
import { useLeaseById, useRentPayments } from "@/hooks/useRealEstate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, User, Building2, Calendar, Receipt, CheckCircle, Clock, AlertTriangle, MessageCircle, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useUiEngine } from "@/hooks/useUiEngine";

const statusIcon: Record<string, { icon: typeof CheckCircle; cls: string }> = {
  paid: { icon: CheckCircle, cls: "text-emerald-600" },
  pending: { icon: Clock, cls: "text-amber-600" },
  overdue: { icon: AlertTriangle, cls: "text-destructive" },
};

export default function LeaseDetailPage() {
  useUiEngine("real-estate-leasedetailpage");
  const { leaseId } = useParams<{ leaseId: string }>();
  const { data: lease, isLoading } = useLeaseById(leaseId);
  const { data: payments, isLoading: paymentsLoading } = useRentPayments(leaseId);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MobilePageHeader title="Lease Details" backTo="/real-estate/leases" />

        {isLoading && (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        )}

        {lease && (
          <div className="space-y-4 mt-4">
            {/* Lease overview */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" /> Lease
                  </CardTitle>
                  <Badge className="capitalize text-xs">{lease.status?.replace(/_/g, " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Tenant</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-primary/70" />
                      {(lease.tenants as any)?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Property</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-primary/70" />
                      {(lease.properties as any)?.label || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Period</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary/70" />
                      {lease.start_date ? format(new Date(lease.start_date), "dd/MM/yyyy") : "—"}
                      {" → "}
                      {lease.end_date ? format(new Date(lease.end_date), "dd/MM/yyyy") : "ongoing"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Rent</p>
                    <p className="font-bold text-primary">
                      {lease.rent_amount}€
                      <span className="font-normal text-muted-foreground text-xs"> +{lease.charges_amount}€</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Deposit</p>
                    <p className="font-medium">{lease.deposit_amount}€</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Type</p>
                    <p className="font-medium capitalize">{lease.lease_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/orbit">
                <Button variant="outline" className="w-full gap-2 h-11 border-border/50">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">Chat with tenant</span>
                </Button>
              </Link>
              <Link to="/wallet">
                <Button variant="outline" className="w-full gap-2 h-11 border-border/50">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs">Pay rent</span>
                </Button>
              </Link>
            </div>

            {/* Rent payments */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary/70" /> Rent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading && <Skeleton className="h-16 rounded-lg" />}
                {!paymentsLoading && (!payments || payments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">No payments recorded.</p>
                )}
                <div className="space-y-1">
                  {payments?.map((p) => {
                    const st = statusIcon[p.status ?? "pending"] || statusIcon.pending;
                    const Icon = st.icon;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${st.cls}`} />
                          <div>
                            <p className="text-sm font-medium">{p.due_date ? format(new Date(p.due_date), "MMM yyyy") : "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {p.due_date ? format(new Date(p.due_date), "dd/MM") : "—"}
                              {p.paid_at && ` · Paid ${format(new Date(p.paid_at), "dd/MM")}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-sm font-bold">{p.amount} {p.currency}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge>
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
