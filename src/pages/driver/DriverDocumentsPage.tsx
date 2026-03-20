import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type DocRow = { id: string; title: string; status: string };

export default function DriverDocumentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DocRow[]>([
    { id: "1", title: "Driving License", status: "Verified" },
    { id: "2", title: "Vehicle Registration", status: "Pending" },
  ]);

  const uploadNew = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), title: `New Document ${prev.length + 1}`, status: "Pending" }]);
    toast.success("Document uploaded");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Driver Documents</h1>
          <p className="text-xs text-muted-foreground">Manage compliance files</p>
        </div>
      </div>

      <button onClick={uploadNew} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Upload Document</button>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
