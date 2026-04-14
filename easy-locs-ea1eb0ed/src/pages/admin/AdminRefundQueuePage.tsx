import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { Loader2 } from "lucide-react";

const AdminRefundPanel = lazy(() => import("@/components/payments/AdminRefundPanel"));

export default function AdminRefundQueuePage() {
  useUiEngine("admin-adminrefundqueuepage");
  const navigate = useNavigate();

  return (
    <SubPageShell>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        <Header title="Refund Queue" subtitle="Review and process refund requests" onBack={() => navigate("/admin")} />
        <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
          <AdminRefundPanel />
        </Suspense>
      </div>
    </SubPageShell>
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
