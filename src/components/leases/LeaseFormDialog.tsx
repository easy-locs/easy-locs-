/**
 * LeaseFormDialog — Create/Edit lease using the canonical `leases` table.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLeaseWorkflow } from "@/hooks/useLeaseWorkflow";

interface LeaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease?: any;
  onSaved: () => void;
  preselectedPropertyId?: string;
  preselectedTenantId?: string;
}

export default function LeaseFormDialog({
  open, onOpenChange, lease, onSaved,
  preselectedPropertyId, preselectedTenantId,
}: LeaseFormDialogProps) {
  const { user, orgId, userCountry } = useAuth();
  const { generateLease } = useLeaseWorkflow();
  const isEdit = !!lease;

  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    property_id: preselectedPropertyId || "",
    tenant_id: preselectedTenantId || "",
    lease_type: "empty",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    payment_day: 5,
    rent_amount: 0,
    charges_amount: 0,
    deposit_amount: 0,
    country: userCountry || "FR",
    notice_period_months: 3,
    duration_months: 36,
    status: "draft",
  });

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("properties").select("id, label, address, city, country").eq("org_id", orgId),
      supabase.from("tenants").select("id, name, email, property_id, rent_amount, charges_amount, deposit_amount").eq("org_id", orgId),
    ]).then(([p, t]) => {
      setProperties(p.data || []);
      setTenants(t.data || []);
    });
  }, [orgId]);

  useEffect(() => {
    if (lease) {
      setForm({
        property_id: lease.property_id || "",
        tenant_id: lease.tenant_id || "",
        lease_type: lease.lease_type || "empty",
        start_date: lease.start_date || "",
        end_date: lease.end_date || "",
        payment_day: lease.payment_day || 5,
        rent_amount: lease.rent_amount || 0,
        charges_amount: lease.charges_amount || 0,
        deposit_amount: lease.deposit_amount || 0,
        country: lease.country || userCountry || "FR",
        notice_period_months: lease.notice_period_months || 3,
        duration_months: lease.duration_months || 36,
        status: lease.status || "draft",
      });
    }
  }, [lease, userCountry]);

  // Auto-fill from tenant when selected
  useEffect(() => {
    if (!isEdit && form.tenant_id) {
      const tenant = tenants.find(t => t.id === form.tenant_id);
      if (tenant) {
        setForm(prev => ({
          ...prev,
          rent_amount: tenant.rent_amount || prev.rent_amount,
          charges_amount: tenant.charges_amount || prev.charges_amount,
          deposit_amount: tenant.deposit_amount || prev.deposit_amount,
          property_id: tenant.property_id || prev.property_id,
        }));
      }
    }
  }, [form.tenant_id, tenants, isEdit]);

  // Auto-fill country from property
  useEffect(() => {
    if (form.property_id) {
      const prop = properties.find(p => p.id === form.property_id);
      if (prop?.country) setForm(prev => ({ ...prev, country: prop.country }));
    }
  }, [form.property_id, properties]);

  const handleSave = async () => {
    if (!form.property_id || !form.tenant_id || !form.start_date) {
      toast.error("Property, tenant and start date are required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("leases").update({
          lease_type: form.lease_type,
          start_date: form.start_date,
          end_date: form.end_date || null,
          payment_day: form.payment_day,
          rent_amount: form.rent_amount,
          charges_amount: form.charges_amount,
          deposit_amount: form.deposit_amount,
          country: form.country,
          notice_period_months: form.notice_period_months,
          duration_months: form.duration_months,
        }).eq("id", lease.id);
        if (error) throw error;
        toast.success("Lease updated");
      } else {
        // Use workflow to create lease with proper lifecycle
        const result = await generateLease(form.tenant_id, form.property_id, {
          rent_amount: form.rent_amount,
          charges_amount: form.charges_amount,
          lease_type: form.lease_type,
          start_date: form.start_date,
        });
        if (!result?.success && result?.action !== "existing") {
          // Fallback: direct insert
          const { error } = await supabase.from("leases").insert({
            org_id: orgId!,
            user_id: user!.id,
            property_id: form.property_id,
            tenant_id: form.tenant_id,
            lease_type: form.lease_type,
            start_date: form.start_date,
            end_date: form.end_date || null,
            payment_day: form.payment_day,
            rent_amount: form.rent_amount,
            charges_amount: form.charges_amount,
            deposit_amount: form.deposit_amount,
            country: form.country,
            notice_period_months: form.notice_period_months,
            duration_months: form.duration_months,
            status: "pending_signature",
          });
          if (error) throw error;
          toast.success("Lease created");
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save lease");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lease" : "Create Lease"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Property */}
          <div>
            <Label>Property *</Label>
            <Select value={form.property_id} onValueChange={v => set("property_id", v)} disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label} — {p.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tenant */}
          <div>
            <Label>Tenant *</Label>
            <Select value={form.tenant_id} onValueChange={v => set("tenant_id", v)} disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} {t.email ? `(${t.email})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lease type */}
          <div>
            <Label>Lease Type</Label>
            <Select value={form.lease_type} onValueChange={v => set("lease_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">Unfurnished</SelectItem>
                <SelectItem value="furnished">Furnished</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Rent</Label>
              <Input type="number" value={form.rent_amount} onChange={e => set("rent_amount", Number(e.target.value))} />
            </div>
            <div>
              <Label>Charges</Label>
              <Input type="number" value={form.charges_amount} onChange={e => set("charges_amount", Number(e.target.value))} />
            </div>
            <div>
              <Label>Deposit</Label>
              <Input type="number" value={form.deposit_amount} onChange={e => set("deposit_amount", Number(e.target.value))} />
            </div>
          </div>

          {/* Payment day + country */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Payment Day</Label>
              <Input type="number" min={1} max={28} value={form.payment_day} onChange={e => set("payment_day", Number(e.target.value))} />
            </div>
            <div>
              <Label>Duration (months)</Label>
              <Input type="number" value={form.duration_months} onChange={e => set("duration_months", Number(e.target.value))} />
            </div>
            <div>
              <Label>Notice (months)</Label>
              <Input type="number" value={form.notice_period_months} onChange={e => set("notice_period_months", Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={e => set("country", e.target.value.toUpperCase())} maxLength={2} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : isEdit ? "Update Lease" : "Create Lease"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
