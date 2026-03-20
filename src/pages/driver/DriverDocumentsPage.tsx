import { useNavigate } from "react-router-dom";

const DOCS = [
  { label: "Driving License", status: "Valid" },
  { label: "Vehicle Registration", status: "Pending renewal" },
  { label: "Insurance", status: "Valid" },
  { label: "Work Permit", status: "Valid" },
];

export default function DriverDocumentsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Documents" subtitle="Compliance and validity" onBack={() => navigate("/driver/dashboard")} />

      <div className="space-y-3">
        {DOCS.map((doc) => (
          <div key={doc.label} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{doc.label}</div>
            <div
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                doc.status === "Valid"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {doc.status}
            </div>
          </div>
        ))}
      </div>
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
