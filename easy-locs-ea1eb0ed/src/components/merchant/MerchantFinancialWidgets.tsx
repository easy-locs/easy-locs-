/**
 * Financial widgets for the merchant dashboard.
 * Shows wallet balance, today's sales, pending/settled amounts.
 */
import { useEffect, useState } from "react";
import { db } from "@/services/db";
import { Wallet, TrendingUp, Clock, CheckCircle2, Truck, Building2 } from "lucide-react";

interface Props {
  merchantProfileId: string;
}

interface Stats {
  walletBalance: number;
  todaySales: number;
  pendingSettlement: number;
  settledAmount: number;
  driverFees: number;
  platformFees: number;
}

export default function MerchantFinancialWidgets({ merchantProfileId }: Props) {
  const [stats, setStats] = useState<Stats>({
    walletBalance: 0,
    todaySales: 0,
    pendingSettlement: 0,
    settledAmount: 0,
    driverFees: 0,
    platformFees: 0,
  });

  useEffect(() => {
    if (!merchantProfileId) return;

    const load = async () => {
      // Get merchant wallet
      const { data: wallet } = await db
        .from("wallet_accounts")
        .select("balance_cash")
        .eq("owner_profile_id", merchantProfileId)
        .eq("owner_type", "merchant")
        .maybeSingle();

      // Get today's orders
      const today = new Date().toISOString().split("T")[0];
      const { data: orders } = await db
        .from("orders")
        .select("gross_amount, merchant_net_amount, driver_amount, platform_commission_amount, settlement_status")
        .eq("merchant_profile_id", merchantProfileId)
        .gte("created_at", today);

      const todaySales = (orders ?? []).reduce((s: number, o: any) => s + Number(o.gross_amount || 0), 0);
      const pendingSettlement = (orders ?? []).filter((o: any) => o.settlement_status !== "settled").reduce((s: number, o: any) => s + Number(o.merchant_net_amount || 0), 0);
      const settledAmount = (orders ?? []).filter((o: any) => o.settlement_status === "settled").reduce((s: number, o: any) => s + Number(o.merchant_net_amount || 0), 0);
      const driverFees = (orders ?? []).reduce((s: number, o: any) => s + Number(o.driver_amount || 0), 0);
      const platformFees = (orders ?? []).reduce((s: number, o: any) => s + Number(o.platform_commission_amount || 0), 0);

      setStats({
        walletBalance: Number(wallet?.balance_cash ?? 0),
        todaySales,
        pendingSettlement,
        settledAmount,
        driverFees,
        platformFees,
      });
    };

    load();
  }, [merchantProfileId]);

  const cards = [
    { label: "Wallet Balance", value: stats.walletBalance, icon: Wallet, color: "hsl(45,80%,55%)" },
    { label: "Today Sales", value: stats.todaySales, icon: TrendingUp, color: "hsl(142,70%,50%)" },
    { label: "Pending Settlement", value: stats.pendingSettlement, icon: Clock, color: "hsl(168,72%,44%)" },
    { label: "Settled", value: stats.settledAmount, icon: CheckCircle2, color: "hsl(142,70%,50%)" },
    { label: "Driver Fees", value: stats.driverFees, icon: Truck, color: "hsl(220,70%,60%)" },
    { label: "Platform Fees", value: stats.platformFees, icon: Building2, color: "hsl(280,60%,60%)" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map(card => (
        <div key={card.label} className="rounded-xl bg-[hsl(220,20%,12%)] border border-[hsl(220,20%,18%)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className="w-4 h-4" style={{ color: card.color }} />
            <span className="text-xs text-[hsl(220,15%,55%)]">{card.label}</span>
          </div>
          <p className="text-lg font-bold text-white">{card.value.toFixed(2)} <span className="text-xs text-[hsl(220,15%,45%)]">AED</span></p>
        </div>
      ))}
    </div>
  );
}
