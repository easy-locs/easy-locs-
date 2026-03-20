import { useNavigate } from "react-router-dom";

const COMPLIANCE_ROWS = [
  { name: "Driver A", docs: "Complete", insurance: "Valid", training: "Done" },
  { name: "Driver B", docs: "Missing", insurance: "Valid", training: "Pending" },
  { name: "Driver C", docs: "Complete", insurance: "Expired", training: "Done" },
];

export default function AdminDriverCompliancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Driver Compliance</h1>
          <p className="text-xs text-muted-foreground">Documents, insurance and training</p>
        </div>
      </div>

      <div className="space-y-3">
        {COMPLIANCE_ROWS.map((row) => (
          <div key={row.name} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-2">Docs: {row.docs}</div>
            <div className="text-xs text-muted-foreground">Insurance: {row.insurance}</div>
            <div className="text-xs text-muted-foreground">Training: {row.training}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
