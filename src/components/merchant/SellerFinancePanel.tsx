/**
 * SellerFinancePanel — Shows KYC status, merchant balances, settlements, payout requests.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  ensureMerchantAccount,
  getMerchantBalances,
  getMerchantSettlements,
} from "@/lib/finance/settlementEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Wallet, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { usePayoutStore } from "@/stores/payoutStore";
import { toast } from "sonner";
import { useState } from "react";

interface SellerFinancePanelProps {
  shopId: string;
}

const KYC_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: "Not Verified", variant: "secondary" },
  pending: { label: "Pending Review", variant: "outline" },
  verified: { label: "Verified", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function fmtMoney(n: number, c?: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c || "AED", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));
  } catch { return `${Number(n || 0).toFixed(2)} ${c || "AED"}`; }
}

export default function SellerFinancePanel({ shopId }: SellerFinancePanelProps) {
  const { user } = useAuth();
  const { createPayoutRequest, loading: payoutLoading } = usePayoutStore();
  const [payoutAmount, setPayoutAmount] = useState("");

  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ["merchant-account", user?.id, shopId],
    queryFn: () => ensureMerchantAccount(user!.id, shopId),
    enabled: !!user?.id && !!shopId,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["merchant-balances", merchant?.id],
    queryFn: () => getMerchantBalances(merchant!.id),
    enabled: !!merchant?.id,
  });

  const { data: settlements = [] } = useQuery({
    queryKey: ["merchant-settlements", merchant?.id],
    queryFn: () => getMerchantSettlements(merchant!.id),
    enabled: !!merchant?.id,
  });

  if (merchantLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!merchant) return null;

  const kycInfo = KYC_LABELS[merchant.kyc_status] ?? KYC_LABELS.not_started;
  const primaryBalance = balances[0];
  const currency = merchant.currency || "AED";

  const handlePayout = async () => {
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) return;
    if (!primaryBalance || amount > Number(primaryBalance.available_balance)) {
      toast.error("Insufficient available balance");
      return;
    }
    if (!merchant.payout_enabled || merchant.kyc_status !== "verified") {
      toast.error("Complete verification to request payouts");
      return;
    }

    try {
      await createPayoutRequest({
        amount,
        currency,
        destinationType: "bank",
        note: `Payout from shop ${shopId}`,
      });
      setPayoutAmount("");
      toast.success("Payout request submitted");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit payout");
    }
  };

  return (
    <div className="space-y-4">
      {/* KYC Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Verification</span>
            </div>
            <Badge variant={kycInfo.variant} className="text-[10px]">
              {kycInfo.label}
            </Badge>
          </div>
          {merchant.kyc_status === "not_started" && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Complete verification to enable payouts and full settlement access.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Balances */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Balances</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Pending</p>
              <p className="text-sm font-bold text-foreground">
                {fmtMoney(primaryBalance?.pending_balance ?? 0, currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Available</p>
              <p className="text-sm font-bold text-primary">
                {fmtMoney(primaryBalance?.available_balance ?? 0, currency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Locked</p>
              <p className="text-sm font-bold text-muted-foreground">
                {fmtMoney(primaryBalance?.locked_balance ?? 0, currency)}
              </p>
            </div>
          </div>

          {merchant.payout_enabled && merchant.kyc_status === "verified" && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={payoutLoading || !payoutAmount}
                  onClick={handlePayout}
                >
                  {payoutLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Request Payout"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Settlements */}
      {settlements.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <span className="text-xs font-semibold text-foreground">Recent Settlements</span>
            {settlements.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  s.status === "released" ? "bg-primary/10" : s.status === "reversed" ? "bg-destructive/10" : "bg-muted"
                }`}>
                  {s.status === "reversed" ? (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground line-clamp-1 break-words">
                    Order #{(s.order_id ?? s.id).slice(0, 8)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">
                    {fmtMoney(s.net_amount, s.currency)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Fee: {fmtMoney(s.platform_fee, s.currency)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[8px] capitalize">
                  {s.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
