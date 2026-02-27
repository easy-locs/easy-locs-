import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─── */
export interface Property {
  id: string;
  label: string;
  address: string;
  postal_code: string;
  city: string;
  property_type: string;
  surface: number;
  rooms: number;
  floor?: number | null;
  heating: string;
  furnished: boolean;
  monthly_rent: number;
  monthly_charges: number;
  deposit_amount: number;
  notes: string;
  building_name?: string | null;
  lot_number?: string | null;
  building_id?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  property_id: string | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number;
  charges_amount: number;
  deposit_amount: number;
  lease_type: string;
  notes: string;
  birth_date?: string | null;
  birth_place?: string | null;
  nationality?: string | null;
  profession?: string | null;
  guarantor_name?: string | null;
  guarantor_phone?: string | null;
  current_address?: string | null;
  tenant_user_id?: string | null;
}

export interface RentCall {
  id: string;
  tenant_id: string;
  property_id: string | null;
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean;
  paid_date: string | null;
  payment_method: string | null;
  receipt_validated: boolean;
  receipt_pdf_url: string | null;
}

export function useRentalData() {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── Load all data ─── */
  const loadProperties = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("org_id", orgId)
      .order("label");
    if (data) setProperties(data.map(p => ({
      id: p.id, label: p.label, address: p.address, postal_code: p.postal_code,
      city: p.city, property_type: p.property_type, surface: Number(p.surface) || 0,
      rooms: p.rooms || 1, floor: p.floor, heating: p.heating || "individual-gas",
      furnished: p.furnished || false, monthly_rent: Number(p.monthly_rent) || 0,
      monthly_charges: Number(p.monthly_charges) || 0, deposit_amount: Number(p.deposit_amount) || 0,
      notes: p.notes || "", building_name: (p as any).building_name || null, lot_number: (p as any).lot_number || null,
      building_id: (p as any).building_id || null,
    })));
  }, [orgId]);

  const loadTenants = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .eq("org_id", orgId)
      .order("name");
    if (data) setTenants(data.map(t => ({
      id: t.id, name: t.name, email: t.email || "", phone: t.phone || "",
      property_id: t.property_id, lease_start: t.lease_start, lease_end: t.lease_end,
      rent_amount: Number(t.rent_amount) || 0, charges_amount: Number(t.charges_amount) || 0,
      deposit_amount: Number(t.deposit_amount) || 0, lease_type: t.lease_type || "empty",
      notes: t.notes || "", birth_date: t.birth_date, birth_place: t.birth_place,
      nationality: t.nationality, profession: t.profession,
      guarantor_name: t.guarantor_name, guarantor_phone: t.guarantor_phone,
      current_address: t.current_address,
      tenant_user_id: t.tenant_user_id,
    })));
  }, [orgId]);

  const loadRentCalls = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("rent_calls")
      .select("*")
      .eq("org_id", orgId)
      .order("month", { ascending: false });
    if (data) setRentCalls(data.map(r => ({
      id: r.id, tenant_id: r.tenant_id, property_id: r.property_id,
      month: r.month, rent_amount: Number(r.rent_amount) || 0,
      charges_amount: Number(r.charges_amount) || 0, total_amount: Number(r.total_amount) || 0,
      paid: r.paid || false, paid_date: r.paid_date, payment_method: r.payment_method || null,
      receipt_validated: r.receipt_validated || false, receipt_pdf_url: r.receipt_pdf_url,
    })));
  }, [orgId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadProperties(), loadTenants(), loadRentCalls()]);
    setLoading(false);
  }, [loadProperties, loadTenants, loadRentCalls]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── Property CRUD ─── */
  const saveProperty = async (form: Omit<Property, "id">, editId?: string) => {
    if (!orgId || !user) return;
    const record = {
      org_id: orgId, user_id: user.id, label: form.label, address: form.address,
      postal_code: form.postal_code, city: form.city, property_type: form.property_type,
      surface: form.surface, rooms: form.rooms, floor: form.floor,
      heating: form.heating, furnished: form.furnished, monthly_rent: form.monthly_rent,
      monthly_charges: form.monthly_charges, deposit_amount: form.deposit_amount, notes: form.notes,
      building_name: form.building_name || null, lot_number: form.lot_number || null,
    };
    if (editId) {
      const { error } = await supabase.from("properties").update(record).eq("id", editId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
      toast({ title: "Bien modifié" });
    } else {
      const { error } = await supabase.from("properties").insert(record);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
      toast({ title: "Bien ajouté" });
    }
    await loadProperties();
    return true;
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bien supprimé" });
    await loadProperties();
  };

  /* ─── Tenant CRUD ─── */
  const saveTenant = async (form: Omit<Tenant, "id">, editId?: string): Promise<string | false> => {
    if (!orgId || !user) return false;
    const record = {
      org_id: orgId, user_id: user.id, name: form.name, email: form.email || null,
      phone: form.phone || null, property_id: form.property_id || null,
      lease_start: form.lease_start || null, lease_end: form.lease_end || null,
      rent_amount: form.rent_amount, charges_amount: form.charges_amount,
      deposit_amount: form.deposit_amount, lease_type: form.lease_type, notes: form.notes || null,
      birth_date: form.birth_date || null, birth_place: form.birth_place || null,
      nationality: form.nationality || null, profession: form.profession || null,
      guarantor_name: form.guarantor_name || null, guarantor_phone: form.guarantor_phone || null,
    };
    if (editId) {
      const { error } = await supabase.from("tenants").update(record).eq("id", editId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
      toast({ title: "Locataire modifié" });
      await loadTenants();
      return editId;
    } else {
      const { data, error } = await supabase.from("tenants").insert(record).select("id").single();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
      toast({ title: "Locataire ajouté" });
      await loadTenants();
      return data.id;
    }
  };

  const deleteTenant = async (id: string) => {
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Locataire supprimé" });
    await loadTenants();
  };

  /* ─── Rent calls ─── */
  const generateMonthlyRentCalls = async () => {
    if (!orgId) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Query DB directly to avoid stale state issues
    const { data: existingCalls } = await supabase
      .from("rent_calls")
      .select("tenant_id")
      .eq("org_id", orgId)
      .eq("month", month);

    const existingIds = new Set((existingCalls || []).map(r => r.tenant_id));
    const newCalls = tenants
      .filter(t => t.rent_amount > 0 && !existingIds.has(t.id))
      .map(t => ({
        org_id: orgId,
        tenant_id: t.id,
        property_id: t.property_id,
        month,
        rent_amount: t.rent_amount,
        charges_amount: t.charges_amount,
        total_amount: t.rent_amount + t.charges_amount,
      }));
    if (newCalls.length === 0) {
      toast({ title: "Tous les appels du mois sont déjà créés" });
      return;
    }
    const { error } = await supabase.from("rent_calls").upsert(newCalls, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${newCalls.length} appel(s) de loyer généré(s)` });
    await loadRentCalls();
  };

  const togglePayment = async (id: string, paymentMethod?: string) => {
    const call = rentCalls.find(r => r.id === id);
    if (!call) return;
    const { error } = await supabase.from("rent_calls").update({
      paid: !call.paid,
      paid_date: !call.paid ? new Date().toISOString() : null,
      payment_method: !call.paid ? (paymentMethod || null) : null,
    }).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await loadRentCalls();
  };

  const validateReceipt = async (id: string) => {
    const { error } = await supabase.from("rent_calls").update({ receipt_validated: true }).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Quittance validée — le locataire peut la télécharger" });
    await loadRentCalls();
  };

  /* ─── Send tenant invite (invitation link) ─── */
  const sendTenantInvite = async (tenant: Tenant) => {
    if (!tenant.email) {
      toast({ title: "Erreur", description: "Le locataire n'a pas d'email", variant: "destructive" });
      return;
    }
    if (!orgId || !user) return;

    try {
      // Generate unique token
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();

      // Create invitation record
      const { error: invError } = await supabase.from("tenant_invitations").insert({
        org_id: orgId,
        tenant_id: tenant.id,
        token,
        email: tenant.email,
        invited_by: user.id,
      });
      if (invError) throw invError;

      // Build invitation URL
      const inviteUrl = `${window.location.origin}/tenant-signup?token=${token}`;

      // Copy to clipboard for the landlord to share
      await navigator.clipboard.writeText(inviteUrl);

      toast({
        title: "Lien d'invitation copié !",
        description: `Envoyez ce lien à ${tenant.name} pour qu'il crée son compte locataire. Le lien expire dans 7 jours.`,
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  /* ─── Assign tenant to property ─── */
  const assignTenantToProperty = async (tenantId: string, propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    const { error } = await supabase
      .from("tenants")
      .update({ property_id: propertyId })
      .eq("id", tenantId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Locataire assigné", description: prop ? `Locataire assigné à ${prop.label}` : "Locataire assigné" });
    await loadTenants();
    return true;
  };

  return {
    properties, tenants, rentCalls, loading,
    saveProperty, deleteProperty,
    saveTenant, deleteTenant, sendTenantInvite,
    generateMonthlyRentCalls, togglePayment, validateReceipt,
    loadAll, loadTenants, loadRentCalls, assignTenantToProperty,
  };
}
