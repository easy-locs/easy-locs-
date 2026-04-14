import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { merchantService } from "@/services/merchant.service";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantClosingModePage() {
  useUiEngine("merchant-merchantclosingmodepage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("Temporary closure");
  const [reopenText, setReopenText] = useState("Tomorrow 10:00");

  const closeStore = async () => {
    try {
      setSaving(true);
      await merchantService.updateMerchant(merchantId, {
        is_open: false,
        closing_reason: reason.trim() || null,
        reopening_hint: reopenText.trim() || null,
      });
      toast.success("Store switched to closing mode");
      navigate(`/merchant/dashboard/${merchantId}`);
    } catch (err: any) {
      toast.error("Could not activate closing mode");
    } finally {
      setSaving(false);
    }
  };

  const reopenStore = async () => {
    try {
      setSaving(true);
      await merchantService.updateMerchant(merchantId, {
        is_open: true,
        closing_reason: null,
        reopening_hint: null,
      });
      toast.success("Store reopened");
      navigate(`/merchant/dashboard/${merchantId}`);
    } catch (err: any) {
      toast.error("Could not reopen store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubPageShell
      title="Closing Mode"
      subtitle="Pause store operations safely"
      onBack={() => navigate(`/merchant/dashboard/${merchantId}`)}
      noContentPad
    >
      <div className="px-4 pt-4 space-y-4">
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
    </SubPageShell>
  );
}
