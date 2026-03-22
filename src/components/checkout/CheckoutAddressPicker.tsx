import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSavedAddresses,
  saveAddress,
  touchAddressUsed,
} from "@/lib/address/address-engine";

// Adapter: fetch saved addresses in flat row shape for the picker
async function listSavedAddresses() {
  const addrs = await getSavedAddresses();
  return addrs.map(a => ({
    id: a.id ?? crypto.randomUUID(),
    label: a.label,
    line1: a.fullAddress,
    city: a.city,
    area: a.area ?? null,
    is_default: a.source === "default",
  }));
}

// Adapter: create address via canonical engine
async function createSavedAddress(input: { label: string; line1: string; city: string; area?: string | null; isDefault?: boolean }) {
  const row = await saveAddress({
    label: input.label,
    fullAddress: input.line1,
    city: input.city,
    area: input.area ?? undefined,
    lat: 0,
    lng: 0,
    isDefault: input.isDefault,
  });
  return { id: row.id, label: row.label ?? input.label, line1: row.full_address ?? input.line1, city: row.city ?? input.city, area: row.area ?? null };
}

// Adapter: set default by touching + saving
async function setDefaultAddress(_userId: string, addressId: string) {
  await touchAddressUsed(addressId);
}

export interface CheckoutAddressValue {
  id: string;
  label: string;
  line1: string;
  city: string;
  area?: string | null;
}

export default function CheckoutAddressPicker({
  value,
  onChange,
}: {
  value: CheckoutAddressValue | null;
  onChange: (value: CheckoutAddressValue | null) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Dubai");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["checkout-address-picker", user?.id],
    queryFn: () => listSavedAddresses(user!.id),
    enabled: !!user?.id,
    staleTime: 5000,
  });

  const selectedText = useMemo(() => {
    if (!value) return "Select address";
    return `${value.label} · ${value.line1}${value.area ? `, ${value.area}` : ""}`;
  }, [value]);

  const chooseAddress = async (row: any) => {
    try {
      if (user?.id) await setDefaultAddress(user.id, row.id);
      onChange({ id: row.id, label: row.label, line1: row.line1, city: row.city, area: row.area });
      setOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not select address");
    }
  };

  const createNow = async () => {
    if (!user?.id) { toast.error("Please sign in first"); return; }
    if (!line1.trim()) { toast.error("Enter address"); return; }

    try {
      setSaving(true);
      const row = await createSavedAddress({
        userId: user.id, label, line1, city, area: area || null, isDefault: true,
      });
      onChange({ id: row.id, label: row.label, line1: row.line1, city: row.city, area: row.area });
      setLine1(""); setArea(""); setOpen(false); refetch();
      toast.success("Address saved");
    } catch (err: any) {
      toast.error(err.message || "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Delivery Address</p>
          <p className="text-sm font-semibold text-foreground truncate">{selectedText}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 pt-2">
          {isLoading && <div className="h-10 rounded-xl bg-muted animate-pulse" />}

          {!isLoading && rows.length > 0 && (
            <div className="space-y-2">
              {rows.map((row: any) => (
                <button
                  key={row.id}
                  onClick={() => chooseAddress(row)}
                  className="w-full rounded-xl bg-muted/60 px-3 py-3 text-left active:scale-[0.99] transition-transform"
                >
                  <p className="text-xs font-bold text-foreground">
                    {row.label} {row.is_default ? "· Default" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.line1}{row.area ? `, ${row.area}` : ""}, {row.city}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground">Add New Address</p>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street / building" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
            <button onClick={createNow} disabled={saving} className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
