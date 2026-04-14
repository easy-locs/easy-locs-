import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function RiderPrioritySubscriptionPage() {
  useUiEngine("riderprioritysubscriptionpage");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<"free" | "pro" | "vip">("free");
  const [loading, setLoading] = useState(false);

  const save = async (nextPlan: "free" | "pro" | "vip") => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await repo.upsertUserSubscription({
        user_id: user.id, plan: nextPlan, status: "active", started_at: new Date().toISOString(),
      });
      setPlan(nextPlan);
    } finally { setLoading(false); }
  };

  const cards = [
    { key: "free" as const, title: "Free", desc: "Standard dispatch", price: "0 AED" },
    { key: "pro" as const, title: "Pro", desc: "Faster pickup and lower surge", price: "29 / month" },
    { key: "vip" as const, title: "VIP", desc: "Top priority dispatch + premium support", price: "79 / month" },
  ];

  return (
    <SubPageShell title="Priority Subscription" subtitle="Upgrade for faster dispatch and premium ride priority" onBack={() => navigate(-1)}>
      <div className="mx-auto max-w-md space-y-3">
        {cards.map((card) => (
          <button key={card.key} onClick={() => save(card.key)} disabled={loading}
            className={`w-full rounded-3xl border p-5 text-left transition-colors ${plan === card.key ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
            <p className="font-semibold">{card.title}</p>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
            <p className="mt-2 text-xs font-medium">{card.price}</p>
          </button>
        ))}
        {loading && <p className="text-xs text-muted-foreground text-center">Saving plan...</p>}
      </div>
    </SubPageShell>
  );
}
