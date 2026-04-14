import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminSupportSlaPage() {
  useUiEngine("admin-adminsupportslapage");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support-sla"],
    queryFn: async () => {
      const { data, error } = await db
        .from("support_tickets")
        .select("*")
        .limit(1000);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const open = rows.filter((r) => String(r.status ?? "") === "open").length;
      const inProgress = rows.filter((r) => ["pending", "in_progress"].includes(String(r.status ?? ""))).length;
      const resolved = rows.filter((r) => String(r.status ?? "") === "resolved").length;

      return { open, inProgress, resolved, rows };
    },
    staleTime: 5000,
  });

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Support SLA</h1>
          <p className="text-xs text-muted-foreground">Ticket load and response overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            <Metric title="Open" value={String(data?.open ?? 0)} />
            <Metric title="In Progress" value={String(data?.inProgress ?? 0)} />
            <Metric title="Resolved" value={String(data?.resolved ?? 0)} />
          </div>

          <div className="px-4 space-y-3">
            {(data?.rows ?? []).slice(0, 20).map((row: any) => (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                <p className="text-sm font-bold text-foreground">{row.subject || "Support ticket"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {row.ticket_type || "general"} · {row.status || "open"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
