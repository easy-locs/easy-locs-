/**
 * BulkProductManager — CSV import/export, bulk edit, mass publish/unpublish.
 */
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, Download, Eye, EyeOff, Trash2, Loader2, CheckSquare, Square, Edit3 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
}

export default function BulkProductManager({ shopId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [importing, setImporting] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["bulk-catalog", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("catalog_items").select("*").eq("shop_id", shopId).order("sort_order");
      return data || [];
    },
    enabled: !!shopId,
  });

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i: any) => i.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkUpdate = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const ids = Array.from(selected);
      if (ids.length === 0) throw new Error("Select items first");
      for (const id of ids) {
        await (supabase as any).from("catalog_items").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bulk-catalog"] }); toast.success(`${selected.size} items updated`); setSelected(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (ids.length === 0) throw new Error("Select items first");
      for (const id of ids) {
        await (supabase as any).from("catalog_items").delete().eq("id", id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bulk-catalog"] }); toast.success(`${selected.size} items deleted`); setSelected(new Set()); },
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      await (supabase as any).from("catalog_items").update({ price, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bulk-catalog"] }); setEditingPrice(null); },
  });

  const exportCSV = () => {
    const headers = ["title", "price", "currency", "sku", "stock_quantity", "available", "category_id", "description"];
    const rows = items.map((i: any) => headers.map(h => JSON.stringify(i[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `catalog-${shopId.slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) throw new Error("Empty CSV");
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
        if (!row.title) continue;
        await (supabase as any).from("catalog_items").insert({
          shop_id: shopId,
          user_id: user!.id,
          title: row.title,
          price: parseFloat(row.price) || 0,
          currency: row.currency || "EUR",
          sku: row.sku || null,
          stock_quantity: parseInt(row.stock_quantity) || null,
          available: row.available !== "false",
          description: row.description || null,
        });
        imported++;
      }
      toast.success(`Imported ${imported} products`);
      qc.invalidateQueries({ queryKey: ["bulk-catalog"] });
    } catch (err: any) {
      toast.error(err.message);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" /> Bulk Management
          </h3>
          <Badge variant="outline" className="text-[10px]">{items.length} products</Badge>
        </div>

        {/* Actions bar */}
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={exportCSV}>
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => bulkUpdate.mutate({ available: true })} disabled={bulkUpdate.isPending}>
                <Eye className="h-3 w-3 mr-1" /> Publish ({selected.size})
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => bulkUpdate.mutate({ available: false })} disabled={bulkUpdate.isPending}>
                <EyeOff className="h-3 w-3 mr-1" /> Unpublish
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => { if (confirm(`Delete ${selected.size} items?`)) bulkDelete.mutate(); }}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </>
          )}
        </div>

        {/* Product list */}
        <div className="space-y-1">
          <button onClick={toggleAll} className="flex items-center gap-2 text-[10px] text-muted-foreground px-1 py-0.5">
            {selected.size === items.length && items.length > 0 ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            Select all
          </button>
          {items.map((item: any) => (
            <div key={item.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${selected.has(item.id) ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border"}`}>
              <button onClick={() => toggle(item.id)}>
                {selected.has(item.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>
              {item.photo_url && <img src={item.photo_url} alt="" className="w-8 h-8 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium line-clamp-2 break-words leading-snug">{item.title}</p>
                <div className="flex items-center gap-2">
                  {item.sku && <span className="text-[9px] text-muted-foreground font-mono">{item.sku}</span>}
                  <Badge className={`text-[8px] ${item.available ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {item.available ? "Live" : "Hidden"}
                  </Badge>
                  {item.stock_quantity !== null && <span className="text-[9px] text-muted-foreground">Stock: {item.stock_quantity}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {editingPrice === item.id ? (
                  <Input
                    autoFocus
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    onBlur={() => { if (newPrice) updatePrice.mutate({ id: item.id, price: parseFloat(newPrice) }); else setEditingPrice(null); }}
                    onKeyDown={e => { if (e.key === "Enter" && newPrice) updatePrice.mutate({ id: item.id, price: parseFloat(newPrice) }); }}
                    className="h-6 w-16 text-[10px] text-right"
                  />
                ) : (
                  <button onClick={() => { setEditingPrice(item.id); setNewPrice(String(item.price)); }} className="text-xs font-bold text-primary hover:underline">
                    {item.price} {item.currency || "EUR"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
