import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function CustomerDeliveryNotesPage() {
  useUiEngine("customer-customerdeliverynotespage");
  const navigate = useNavigate();
  const [notes, setNotes] = useState("Leave at the door");
  const [ringBell, setRingBell] = useState(true);
  const [callOnArrival, setCallOnArrival] = useState(false);

  const save = async () => {
    toast.success("Delivery preferences saved");
    navigate("/settings");
  };

  return (
    <SubPageShell title="Delivery Notes" subtitle="Instructions for your orders" onBack={() => navigate("/settings")} noContentPad>
      <div className="px-4 pt-4 space-y-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add delivery instructions..."
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
        />

        <button
          onClick={() => setRingBell((v) => !v)}
          className="w-full rounded-2xl border border-border/20 bg-background p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Ring Bell</span>
            <span className="text-xs text-muted-foreground">{ringBell ? "On" : "Off"}</span>
          </div>
        </button>

        <button
          onClick={() => setCallOnArrival((v) => !v)}
          className="w-full rounded-2xl border border-border/20 bg-background p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Call On Arrival</span>
            <span className="text-xs text-muted-foreground">{callOnArrival ? "On" : "Off"}</span>
          </div>
        </button>

        <button
          onClick={save}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
        >
          Save Preferences
        </button>
      </div>
    </SubPageShell>
  );
}
