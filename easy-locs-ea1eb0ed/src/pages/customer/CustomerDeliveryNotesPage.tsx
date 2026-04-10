import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function CustomerDeliveryNotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState("Leave at the door");
  const [ringBell, setRingBell] = useState(true);
  const [callOnArrival, setCallOnArrival] = useState(false);

  const save = async () => {
    toast.success("Delivery preferences saved");
    navigate("/settings");
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Delivery Notes</h1>
          <p className="text-xs text-muted-foreground">Instructions for your orders</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
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
    </div>
  );
}
