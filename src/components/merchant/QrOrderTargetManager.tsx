/**
 * QR Order Target Manager — merchant generates QR codes for tables/counter/global menu.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Plus, Trash2 } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

interface Props {
  merchantProfileId: string;
  storefrontPageId: string;
}

interface QrTarget {
  id: string;
  target_type: string;
  target_label: string;
  target_code: string;
  table_number: string | null;
  active: boolean;
}

export default function QrOrderTargetManager({ merchantProfileId, storefrontPageId }: Props) {
  const [targets, setTargets] = useState<QrTarget[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<string>("table");
  const [newTable, setNewTable] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("qr_order_targets")
      .select("*")
      .eq("merchant_profile_id", merchantProfileId)
      .order("created_at", { ascending: false });
    setTargets(data ?? []);
  };

  useEffect(() => { load(); }, [merchantProfileId]);

  const create = async () => {
    if (!newLabel.trim()) return;
    const code = `el-${merchantProfileId.slice(0, 6)}-${Date.now().toString(36)}`;
    const { error } = await (supabase as any).from("qr_order_targets").insert({
      merchant_profile_id: merchantProfileId,
      storefront_page_id: storefrontPageId,
      target_type: newType,
      target_label: newLabel.trim(),
      target_code: code,
      table_number: newType === "table" ? newTable || null : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("QR target created");
    setNewLabel("");
    setNewTable("");
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("qr_order_targets").delete().eq("id", id);
    toast.success("Removed");
    load();
  };

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <QrCode className="w-5 h-5 text-[hsl(45,80%,55%)]" />
        <h3 className="text-base font-bold text-white">QR Order Targets</h3>
      </div>

      {/* Create new */}
      <div className="flex flex-wrap gap-2">
        <select
          value={newType}
          onChange={e => setNewType(e.target.value)}
          className="rounded-lg bg-[hsl(220,20%,14%)] border border-[hsl(220,20%,20%)] text-white text-sm px-3 py-2"
        >
          <option value="table">Table</option>
          <option value="counter">Counter</option>
          <option value="global_menu">Global Menu</option>
          <option value="room_service">Room Service</option>
        </select>
        <Input
          placeholder="Label (e.g. Table 5)"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="flex-1 min-w-[120px] bg-[hsl(220,20%,14%)] border-[hsl(220,20%,20%)] text-white"
        />
        {newType === "table" && (
          <Input
            placeholder="#"
            value={newTable}
            onChange={e => setNewTable(e.target.value)}
            className="w-16 bg-[hsl(220,20%,14%)] border-[hsl(220,20%,20%)] text-white"
          />
        )}
        <Button onClick={create} size="sm" className="bg-[hsl(45,80%,55%)] text-[hsl(220,30%,6%)]">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {targets.map(t => (
          <div key={t.id} className="rounded-xl bg-[hsl(220,20%,12%)] border border-[hsl(220,20%,18%)] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{t.target_label}</p>
                <p className="text-xs text-[hsl(220,15%,50%)] capitalize">{t.target_type.replace("_", " ")}{t.table_number ? ` #${t.table_number}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="text-[hsl(45,80%,55%)]">
                  <QrCode className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {expanded === t.id && (
              <div className="mt-3 flex flex-col items-center gap-2 p-4 bg-white rounded-lg">
                <QRCode value={`${baseUrl}/#/qr/${t.target_code}`} size={160} />
                <p className="text-xs text-gray-500 break-all">{baseUrl}/#/qr/{t.target_code}</p>
              </div>
            )}
          </div>
        ))}
        {targets.length === 0 && (
          <p className="text-center text-[hsl(220,15%,40%)] text-sm py-4">No QR targets yet</p>
        )}
      </div>
    </div>
  );
}
