/**
 * SettingsAddresses — Manage saved delivery & billing addresses.
 * Connected to dedicated user_addresses table.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Plus, Home, Briefcase, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SavedAddress {
  id: string;
  label: string;
  icon: "home" | "work" | "other";
  line1: string;
  line2?: string;
  city: string;
  country: string;
  is_default: boolean;
}

const ICON_MAP = { home: Home, work: Briefcase, other: MapPin };
const db = supabase as any;

export default function SettingsAddresses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", line1: "", city: "", country: "" });
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
        const mapped: SavedAddress[] = data.map((row: any) => ({
          id: row.id,
          label: row.label || "Address",
          icon: row.icon || "other",
          line1: row.line1 || "",
          line2: row.line2 || "",
          city: row.city || "",
          country: row.country || "",
          is_default: row.is_default || false,
        }));
        setAddresses(mapped);
      } else {
        setAddresses([
          { id: "temp-home", label: "Home", icon: "home", line1: "", city: "", country: "", is_default: true },
          { id: "temp-work", label: "Work", icon: "work", line1: "", city: "", country: "", is_default: false },
        ]);
      }
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const saveAddress = async (addr: SavedAddress) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (addr.id.startsWith("temp-")) {
        const { data, error } = await db
          .from("user_addresses")
          .insert({
            user_id: user.id,
            label: addr.label,
            icon: addr.icon,
            line1: addr.line1,
            line2: addr.line2 || "",
            city: addr.city,
            country: addr.country,
            is_default: addr.is_default,
          })
          .select()
          .single();

        if (error) throw error;
        setAddresses(prev => prev.map(a => a.id === addr.id ? { ...addr, id: data.id } : a));
      } else {
        const { error } = await db
          .from("user_addresses")
          .update({
            label: addr.label,
            line1: addr.line1,
            line2: addr.line2 || "",
            city: addr.city,
            country: addr.country,
            is_default: addr.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq("id", addr.id);

        if (error) throw error;
        setAddresses(prev => prev.map(a => a.id === addr.id ? addr : a));
      }
      toast.success("Address saved");
    } catch (err: any) {
      toast.error("Failed to save address");
      console.error(err);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  const startEdit = (addr: SavedAddress) => {
    setEditing(addr.id);
    setEditForm({ label: addr.label, line1: addr.line1, city: addr.city, country: addr.country });
  };

  const confirmEdit = (id: string) => {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;
    saveAddress({ ...addr, label: editForm.label || addr.label, line1: editForm.line1, city: editForm.city, country: editForm.country });
  };

  const addNew = () => {
    const newAddr: SavedAddress = {
      id: `temp-${Date.now()}`,
      label: "Other",
      icon: "other",
      line1: "",
      city: "",
      country: "",
      is_default: false,
    };
    setAddresses(prev => [...prev, newAddr]);
    startEdit(newAddr);
  };

  const removeAddr = async (id: string) => {
    if (!id.startsWith("temp-")) {
      await db.from("user_addresses").delete().eq("id", id);
    }
    setAddresses(prev => prev.filter(a => a.id !== id));
    toast.success("Address removed");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Addresses</h1>
        </div>
        <button
          onClick={addNew}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-primary/8"
        >
          <Plus className="w-4.5 h-4.5 text-primary" />
        </button>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2">
        <p className="text-xs text-muted-foreground mb-3">
          Manage your saved delivery and billing addresses
        </p>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading addresses...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => {
              const Icon = ICON_MAP[addr.icon];
              const isEmpty = !addr.line1;

              if (editing === addr.id) {
                return (
                  <div key={addr.id} className="rounded-2xl p-4 space-y-3 bg-card border border-primary/30">
                    <p className="text-sm font-bold text-foreground">{addr.label}</p>
                    <input
                      type="text"
                      placeholder="Street address"
                      value={editForm.line1}
                      onChange={e => setEditForm(f => ({ ...f, line1: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border border-border/30"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={editForm.city}
                        onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border border-border/30"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={editForm.country}
                        onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border border-border/30"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmEdit(addr.id)}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground flex items-center justify-center gap-1.5"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-muted text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={addr.id} className="rounded-2xl p-4 flex items-center gap-3 bg-card border border-border/12">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/8">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{addr.label}</p>
                      {addr.is_default && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {isEmpty ? "No address saved yet — tap edit" : `${addr.line1}${addr.city ? `, ${addr.city}` : ""}${addr.country ? ` · ${addr.country}` : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(addr)} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {!addr.is_default && (
                      <button onClick={() => removeAddr(addr.id)} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
