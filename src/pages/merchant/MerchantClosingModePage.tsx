import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantClosingModePage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("Temporary closure");
  const [reopenText, setReopenText] = useState("Tomorrow 10:00");

  const closeStore = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("seed_merchants")
        .update({
          is_open: false,
          closing_reason: reason.trim() || null,
          reopening_hint: reopenText.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId);
      if (error) throw error;
      toast.success("Store switched to closing mode");
      navigate(`/merchant/dashboard/${merchantId}`);
    } catch (err: any) {
      toast.error(err.message || "Could not activate closing mode");
    } finally {
      setSaving(false);
    }
  };

  const reopenStore = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("seed_merchants")
        .update({
          is_open: true,
          closing_reason: null,
          reopening_hint: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId);
      if (error) throw error;
      toast.success("Store reopened");
      navigate(`/merchant/dashboard/${merchantId}`);
    } catch (err: any) {
      toast.error(err.message || "Could not reopen store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Closing Mode</h1>
          <p className="text-xs text-muted-foreground">Pause store operations safely</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Closing reason"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <input
          value={reopenText}
          onChange={(e) => setReopenText(e.target.value)}
          placeholder="Reopening hint"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <div className="flex gap-3">
          <button onClick={closeStore} disabled={saving} className="flex-1 rounded-xl bg-destructive text-destructive-foreground px-4 py-3 text-sm font-bold">
            {saving ? "Saving..." : "Close Store"}
          </button>
          <button onClick={reopenStore} disabled={saving} className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
            {saving ? "Saving..." : "Reopen"}
          </button>
        </div>
      </div>
    </div>
  );
}
