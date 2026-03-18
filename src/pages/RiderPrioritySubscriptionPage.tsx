import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function RiderPrioritySubscriptionPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<"free" | "pro" | "vip">("free");
  const [loading, setLoading] = useState(false);

  const save = async (nextPlan: "free" | "pro" | "vip") => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await supabase.from("user_subscriptions" as any).upsert({
        user_id: userId,
        plan: nextPlan,
        status: "active",
        started_at: new Date().toISOString(),
      } as any);
      setPlan(nextPlan);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { key: "free" as const, title: "Free", desc: "Standard dispatch", price: "0 AED" },
    { key: "pro" as const, title: "Pro", desc: "Faster pickup and lower surge", price: "29 AED / month" },
    { key: "vip" as const, title: "VIP", desc: "Top priority dispatch + premium support", price: "79 AED / month" },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <BackCard title="Priority Subscription" />

        <p className="text-sm text-muted-foreground">
          Upgrade for faster dispatch and premium ride priority
        </p>

        <div className="space-y-3">
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={() => save(card.key)}
              disabled={loading}
              className={`w-full rounded-3xl border p-5 text-left transition-colors ${
                plan === card.key
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card"
              }`}
            >
              <p className="font-semibold">{card.title}</p>
              <p className="text-sm text-muted-foreground">{card.desc}</p>
              <p className="mt-2 text-xs font-medium">{card.price}</p>
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-xs text-muted-foreground text-center">Saving plan...</p>
        )}
      </div>
    </div>
  );
}
