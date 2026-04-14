import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  listAutoRepeatOrders,
  toggleAutoRepeatOrder,
  deleteAutoRepeatOrder,
} from "@/lib/orders/autoRepeatEngine";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function CustomerAutoRepeatPage() {
  useUiEngine("customer-customerautorepeatpage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading, refetch , isError } = useQuery({
    queryKey: ["auto-repeat-orders", user?.id],
    queryFn: () => listAutoRepeatOrders(user?.id),
    enabled: !!user?.id,
    staleTime: 5000,
  });

  const toggle = async (row: any) => {
    try {
      await toggleAutoRepeatOrder(row.id, !row.enabled);
      toast.success("Auto repeat updated");
      refetch();
    } catch (e: any) {
      toast.error("Could not update auto repeat");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAutoRepeatOrder(id);
      toast.success("Auto repeat removed");
      refetch();
    } catch (e: any) {
      toast.error("Could not delete auto repeat");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Auto Repeat" subtitle="Recurring order plans" onBack={() => navigate("/me")} />

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}

      {!isLoading && rows.length === 0 && (
        <EmptyState title="No auto-repeat orders" description="Set up recurring orders from your order history" />
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
              <div className="text-sm font-bold">Order #{String(row.source_order_id).slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Frequency: {row.frequency} · {row.enabled ? "Enabled" : "Disabled"}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => toggle(row)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
                  {row.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => remove(row.id)} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
      <div className="text-3xl">🔁</div>
      <div className="text-base font-bold mt-3">{title}</div>
      <div className="text-sm text-muted-foreground mt-2">{description}</div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-28 rounded-[28px] bg-muted animate-pulse" />;
}
