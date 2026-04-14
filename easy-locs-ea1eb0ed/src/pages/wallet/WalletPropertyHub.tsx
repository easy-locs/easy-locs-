import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstatePaymentService } from "@/services/real-estate.service";
import type { PropertyPayment, PaymentType } from "@/domains/real-estate/canonical-types";
import { useUiEngine } from "@/hooks/useUiEngine";
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock, Receipt,
  ChevronRight, DollarSign, AlertTriangle, Download, Building2,
} from "lucide-react";

const navy = "hsl(225 22% 16%)";
const gold = "hsl(var(--accent))";

type Tab = "overview" | "rents" | "deposits" | "payouts" | "expenses";

const TABS: { key: Tab; labelKey: string; icon: React.ReactNode }[] = [
  { key: "overview", labelKey: "re.wallet.overview", icon: <TrendingUp size={14} /> },
  { key: "rents", labelKey: "re.wallet.rents", icon: <DollarSign size={14} /> },
  { key: "deposits", labelKey: "re.wallet.deposits", icon: <Receipt size={14} /> },
  { key: "payouts", labelKey: "re.wallet.payouts", icon: <TrendingDown size={14} /> },
  { key: "expenses", labelKey: "re.wallet.expenses", icon: <Download size={14} /> },
];

export default function WalletPropertyHub() {
  useUiEngine("wallet-walletpropertyhub");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [payments, setPayments] = useState<PropertyPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    realEstatePaymentService.fetchByUser(user.id)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const rents = payments.filter(p => p.paymentType === "rent");
  const deposits = payments.filter(p => p.paymentType === "deposit");
  const payouts = payments.filter(p => p.paymentType === "payout");
  const expenses = payments.filter(p => ["maintenance_cost", "agency_fee", "commission"].includes(p.paymentType));
  const overdue = payments.filter(p => p.status === "overdue");

  const totalReceived = rents.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = rents.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalOverdue = overdue.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  const getFilteredPayments = (): PropertyPayment[] => {
    switch (activeTab) {
      case "rents": return rents;
      case "deposits": return deposits;
      case "payouts": return payouts;
      case "expenses": return expenses;
      default: return payments;
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f8f9fa" }}>
      <div className="px-4 pt-4 pb-4" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/wallet")} className="p-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">{t("re.wallet.title", "Property Finance")}</h1>
            <p className="text-xs text-white/50">{t("re.wallet.subtitle", "Rents, deposits, payouts & expenses")}</p>
          </div>
          <Building2 size={20} style={{ color: gold }} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp size={12} style={{ color: "#22c55e" }} />
              <span className="text-[10px] text-white/50">{t("re.wallet.received", "Received")}</span>
            </div>
            <p className="text-lg font-bold text-white">{totalReceived.toLocaleString()}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-1 mb-1">
              <Clock size={12} style={{ color: gold }} />
              <span className="text-[10px] text-white/50">{t("re.wallet.pending", "Pending")}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: gold }}>{totalPending.toLocaleString()}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle size={12} style={{ color: "#ef4444" }} />
              <span className="text-[10px] text-white/50">{t("re.wallet.overdue", "Overdue")}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: totalOverdue > 0 ? "#ef4444" : "#fff" }}>{totalOverdue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown size={12} style={{ color: "#f59e0b" }} />
              <span className="text-[10px] text-white/50">{t("re.wallet.expenses", "Expenses")}</span>
            </div>
            <p className="text-lg font-bold text-white">{totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                background: activeTab === tab.key ? gold : "rgba(255,255,255,0.1)",
                color: activeTab === tab.key ? navy : "rgba(255,255,255,0.6)",
              }}
            >
              {tab.icon} {t(tab.labelKey, tab.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : getFilteredPayments().length === 0 ? (
          <div className="text-center py-12">
            <Receipt size={40} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm" style={{ color: "#999" }}>{t("re.wallet.no_transactions", "No transactions yet")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {getFilteredPayments().map(payment => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: PropertyPayment }) {
  const { t } = useI18n();

  const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    rent: { icon: <DollarSign size={16} />, color: "#22c55e" },
    deposit: { icon: <Receipt size={16} />, color: "#3b82f6" },
    payout: { icon: <TrendingDown size={16} />, color: "#8b5cf6" },
    agency_fee: { icon: <Building2 size={16} />, color: "#f59e0b" },
    commission: { icon: <TrendingUp size={16} />, color: "#06b6d4" },
    maintenance_cost: { icon: <AlertTriangle size={16} />, color: "#ef4444" },
    refund: { icon: <Download size={16} />, color: "#6b7280" },
  };

  const config = typeConfig[payment.paymentType] ?? { icon: <DollarSign size={16} />, color: "#999" };

  const statusColors: Record<string, string> = {
    paid: "#22c55e",
    pending: "#f59e0b",
    overdue: "#ef4444",
    partial: "#f97316",
    cancelled: "#9ca3af",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#fff" }}>
      <div className="p-2 rounded-lg" style={{ background: `${config.color}15` }}>
        <span style={{ color: config.color }}>{config.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize" style={{ color: navy }}>
          {t(`re.payment.${payment.paymentType}`, payment.paymentType.replace(/_/g, " "))}
        </p>
        <p className="text-xs" style={{ color: "#999" }}>
          {new Date(payment.dueDate).toLocaleDateString()}
          {payment.reference && ` · ${payment.reference}`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold" style={{ color: navy }}>
          {payment.amount.toLocaleString()} {payment.currency}
        </p>
        <p className="text-[10px] font-medium capitalize" style={{ color: statusColors[payment.status] ?? "#999" }}>
          {t(`re.payment_status.${payment.status}`, payment.status)}
        </p>
      </div>
    </div>
  );
}
