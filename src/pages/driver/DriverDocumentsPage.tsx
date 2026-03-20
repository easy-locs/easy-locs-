import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DOCS = [
  { key: "license", label: "Driving License" },
  { key: "emirates_id", label: "Emirates ID" },
  { key: "vehicle_registration", label: "Vehicle Registration" },
  { key: "insurance", label: "Insurance" },
];

export default function DriverDocumentsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Driver Documents</h1>
          <p className="text-xs text-muted-foreground">Upload and track required files</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {DOCS.map((doc) => (
          <div key={doc.key} className="rounded-2xl border border-border/20 bg-card p-4">
            <p className="text-sm font-bold text-foreground">{doc.label}</p>
            <button
              onClick={() => toast.info(`Upload flow for ${doc.label} can be connected next`)}
              className="mt-3 w-full rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-foreground"
            >
              Upload Document
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
