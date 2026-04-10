import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Plus, Home, Briefcase, MapPin, Star, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

type AddressRow = {
  id: string;
  label: string;
  icon: "home" | "work" | "other";
  line1: string;
  line2?: string;
  city: string;
  country: string;
  isDefault: boolean;
};

const LABEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home: Home,
  Work: Briefcase,
};

const LABEL_COLORS: Record<string, string> = {
  Home: "hsl(210 80% 52%)",
  Work: "hsl(270 60% 55%)",
};



export default function CustomerAddressBookPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<AddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", line1: "", city: "", country: "" });
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setRows(data.map((row: any) => ({
          id: row.id,
          label: row.label || "Address",
          icon: row.icon || "other",
          line1: row.line1 || "",
          line2: row.line2 || "",
          city: row.city || "",
          country: row.country || "",
          isDefault: row.is_default || false,
        })));
      } else {
        setRows([
          { id: "temp-home", label: "Home", icon: "home", line1: "", city: "", country: "", isDefault: true },
          { id: "temp-work", label: "Work", icon: "work", line1: "", city: "", country: "", isDefault: false },
        ]);
      }
    } catch (err) {
      console.error("Failed to load addresses:", err);
      setRows([
        { id: "temp-home", label: "Home", icon: "home", line1: "", city: "", country: "", isDefault: true },
        { id: "temp-work", label: "Work", icon: "work", line1: "", city: "", country: "", isDefault: false },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const startEdit = (row: AddressRow) => {
    setEditingId(row.id);
    setForm({ label: row.label, line1: row.line1, city: row.city, country: row.country || "" });
  };

  const saveEdit = async () => {
    if (!editingId || !user?.id) return;
    if (!form.label.trim() || !form.line1.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSaving(true);
    try {
      const addr = rows.find(r => r.id === editingId);
      if (!addr) return;

      if (editingId.startsWith("temp-")) {
        const { data, error } = await db
          .from("user_addresses")
          .insert({
            user_id: user.id,
            label: form.label,
            icon: addr.icon,
            line1: form.line1,
            city: form.city,
            country: form.country || "",
            is_default: addr.isDefault,
          })
          .select()
          .single();

        if (error) throw error;
        setRows(prev => prev.map(r => r.id === editingId ? {
          ...r, label: form.label, line1: form.line1, city: form.city, country: form.country, id: data.id,
        } : r));
      } else {
        const { error } = await db
          .from("user_addresses")
          .update({
            label: form.label,
            line1: form.line1,
            city: form.city,
            country: form.country || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
        setRows(prev => prev.map(r => r.id === editingId ? {
          ...r, label: form.label, line1: form.line1, city: form.city, country: form.country,
        } : r));
      }
      toast.success("Address saved");
    } catch (err: any) {
      toast.error("Failed to save address");
      console.error(err);
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const addAddress = () => {
    const id = `temp-${Date.now()}`;
    const row: AddressRow = { id, label: "Other", icon: "other", line1: "", city: "", country: "", isDefault: false };
    setRows((prev) => [...prev, row]);
    startEdit(row);
  };

  const removeAddress = async (id: string) => {
    if (!id.startsWith("temp-")) {
      await db.from("user_addresses").delete().eq("id", id);
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success("Address removed");
  };

  const makeDefault = async (id: string) => {
    if (!user?.id) return;
    if (!id.startsWith("temp-")) {
      await db.from("user_addresses").update({ is_default: false }).eq("user_id", user.id);
      await db.from("user_addresses").update({ is_default: true }).eq("id", id);
    }
    setRows((prev) => prev.map((row) => ({ ...row, isDefault: row.id === id })));
    toast.success("Default address updated");
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Address Book</h1>
          <p className="text-xs text-muted-foreground">{rows.length} saved location{rows.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={addAddress}
          className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white active:scale-[0.97] transition-transform"
          style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 12px hsl(var(--primary) / 0.25)" }}
        >
          <Plus className="w-4 h-4" />
          Add New Address
        </motion.button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading addresses...</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {rows.map((row, idx) => {
              const isEditing = editingId === row.id;
              const LabelIcon = LABEL_ICONS[row.label] ?? MapPin;
              const labelColor = LABEL_COLORS[row.label] ?? "hsl(152 60% 42%)";

              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className="rounded-2xl bg-card overflow-hidden"
                  style={{ border: isEditing ? `1px solid hsl(var(--primary) / 0.3)` : "1px solid hsl(var(--border) / 0.1)" }}
                >
                  {isEditing ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${labelColor}12` }}>
                          <Pencil className="w-4 h-4" style={{ color: labelColor }} />
                        </div>
                        <span className="text-sm font-bold text-foreground">Edit Address</span>
                      </div>
                      <input
                        value={form.label}
                        onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Label (Home, Work, etc.)"
                        className="w-full rounded-xl bg-background px-3.5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
                      />
                      <input
                        value={form.line1}
                        onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
                        placeholder="Street address"
                        className="w-full rounded-xl bg-background px-3.5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
                      />
                      <input
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="City"
                        className="w-full rounded-xl bg-background px-3.5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
                      />
                      <input
                        value={form.country}
                        onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                        placeholder="Country"
                        className="w-full rounded-xl bg-background px-3.5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white"
                          style={{ background: "hsl(var(--primary))" }}
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold"
                          style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${labelColor}10` }}>
                          <LabelIcon className="w-5 h-5" style={{ color: labelColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">{row.label}</p>
                            {row.isDefault && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
                                <Star className="w-2.5 h-2.5" /> Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{row.line1 || "No address set"}</p>
                          {row.city && <p className="text-[11px] text-muted-foreground/70">{[row.city, row.country].filter(Boolean).join(", ")}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.06)" }}>
                        <button onClick={() => startEdit(row)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold active:scale-95 transition-transform" style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}>
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {!row.isDefault && (
                          <button onClick={() => makeDefault(row.id)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold active:scale-95 transition-transform" style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
                            <Star className="w-3 h-3" /> Set Default
                          </button>
                        )}
                        <button onClick={() => removeAddress(row.id)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold active:scale-95 transition-transform" style={{ background: "hsl(var(--destructive) / 0.08)", color: "hsl(var(--destructive))" }}>
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
