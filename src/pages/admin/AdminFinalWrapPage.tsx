import { useNavigate } from "react-router-dom";
import { FinalStatusLegendCard } from "@/components/ui/FinalStatusLegendCard";
import { FinalAppVersionBanner } from "@/components/app/FinalAppVersionBanner";

export default function AdminFinalWrapPage() {
  const navigate = useNavigate();

  const actions = [
    { label: "Master Control", path: "/admin/master-control" },
    { label: "System Live", path: "/admin/system-live" },
    { label: "Go Live Readiness", path: "/admin/go-live-readiness" },
    { label: "Production Checklist", path: "/admin/production-checklist" },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Final Wrap</h1>
          <p className="text-xs text-muted-foreground">Launch control center</p>
        </div>
      </div>

      <FinalAppVersionBanner />
      <FinalStatusLegendCard />

      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="w-full rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
