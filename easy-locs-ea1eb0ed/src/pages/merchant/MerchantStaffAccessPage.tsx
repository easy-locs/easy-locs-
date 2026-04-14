import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  inviteMerchantStaff,
  listMerchantStaff,
  toggleMerchantStaffStatus,
} from "@/lib/merchant/staffAccessEngine";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantStaffAccessPage() {
  useUiEngine("merchant-merchantstaffaccesspage");
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "cashier" | "kitchen" | "support">("manager");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], refetch, isLoading , isError } = useQuery({
    queryKey: ["merchant-staff", merchantId],
    queryFn: () => listMerchantStaff(merchantId!),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const invite = async () => {
    if (!merchantId) return;
    if (!fullName.trim() || !email.trim()) {
      toast.error("Enter staff name and email");
      return;
    }

    try {
      setSaving(true);
      await inviteMerchantStaff({
        merchantId,
        fullName: fullName.trim(),
        email: email.trim(),
        role,
      });
      toast.success("Staff invited");
      setFullName("");
      setEmail("");
      setRole("manager");
      refetch();
    } catch (e: any) {
      toast.error("Could not invite staff");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: any) => {
    try {
      await toggleMerchantStaffStatus(row.id, row.status !== "active");
      toast.success("Staff access updated");
      refetch();
    } catch (e: any) {
      toast.error("Could not update staff");
    }
  };

  return (
    <SubPageShell>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Staff Access</h1>
          <p className="text-xs text-muted-foreground">Manage team permissions</p>
        </div>
      </div>

      <div className="space-y-3">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm">
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
          <option value="kitchen">Kitchen</option>
          <option value="support">Support</option>
        </select>
        <button onClick={invite} disabled={saving} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          {saving ? "Inviting..." : "Invite Staff"}
        </button>
      </div>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && <div className="h-28 rounded-[28px] bg-muted animate-pulse" />}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <div className="text-3xl">👥</div>
          <div className="text-base font-bold mt-3">No staff yet</div>
          <div className="text-sm text-muted-foreground mt-2">Invite your first team member above</div>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 space-y-1">
              <div className="text-sm font-bold">{row.full_name}</div>
              <div className="text-xs text-muted-foreground">{row.email} · {row.role}</div>
              <div className="text-xs text-muted-foreground">Status: {row.status}</div>
              <button onClick={() => toggle(row)} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">
                {row.status === "active" ? "Disable Access" : "Enable Access"}
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </SubPageShell>
  );
}
