import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Plus, X, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface VariantEditorProps {
  itemId: string;
  basePrice: number;
}

interface VariantAxis {
  name: string;
  values: string[];
}

interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  price_adjustment: number;
  stock_quantity: number;
  available: boolean;
  option_values: Record<string, string>;
}

export default function VariantEditor({ itemId, basePrice }: VariantEditorProps) {
  const qc = useQueryClient();
  const [axes, setAxes] = useState<VariantAxis[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [newAxisName, setNewAxisName] = useState("");
  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});

  const { data: existingVariants = [], isLoading } = useQuery({
    queryKey: ["catalog-variants", itemId],
    queryFn: async () => {
      const { data } = await db.from("catalog_variants").select("*").eq("item_id", itemId).order("name");
      return data ?? [];
    },
    enabled: !!itemId,
  });

  useEffect(() => {
    if (existingVariants.length > 0) {
      const axisMap = new Map<string, Set<string>>();
      existingVariants.forEach((v: any) => {
        const opts = v.option_values || {};
        Object.entries(opts).forEach(([key, val]) => {
          if (!axisMap.has(key)) axisMap.set(key, new Set());
          axisMap.get(key)!.add(val as string);
        });
      });
      const reconstructedAxes: VariantAxis[] = [];
      axisMap.forEach((vals, name) => {
        reconstructedAxes.push({ name, values: Array.from(vals) });
      });
      if (reconstructedAxes.length > 0) setAxes(reconstructedAxes);

      setVariants(existingVariants.map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku || "",
        price_adjustment: v.price_adjustment || 0,
        stock_quantity: v.stock_quantity || 0,
        available: v.available !== false,
        option_values: v.option_values || {},
      })));
    }
  }, [existingVariants]);

  const addAxis = () => {
    if (!newAxisName.trim()) return;
    if (axes.length >= 3) { toast.error("Maximum 3 axes allowed"); return; }
    if (axes.find(a => a.name.toLowerCase() === newAxisName.trim().toLowerCase())) { toast.error("Axis already exists"); return; }
    setAxes([...axes, { name: newAxisName.trim(), values: [] }]);
    setNewAxisName("");
  };

  const removeAxis = (index: number) => {
    setAxes(axes.filter((_, i) => i !== index));
  };

  const addValueToAxis = (axisIndex: number) => {
    const val = (tagInputs[axisIndex] || "").trim();
    if (!val) return;
    const axis = axes[axisIndex];
    if (axis.values.includes(val)) { toast.error("Value already exists"); return; }
    const newAxes = [...axes];
    newAxes[axisIndex] = { ...axis, values: [...axis.values, val] };
    setAxes(newAxes);
    setTagInputs({ ...tagInputs, [axisIndex]: "" });
  };

  const removeValueFromAxis = (axisIndex: number, valIndex: number) => {
    const newAxes = [...axes];
    newAxes[axisIndex] = { ...newAxes[axisIndex], values: newAxes[axisIndex].values.filter((_, i) => i !== valIndex) };
    setAxes(newAxes);
  };

  const generateCombinations = useCallback(() => {
    const validAxes = axes.filter(a => a.values.length > 0);
    if (validAxes.length === 0) { setVariants([]); return; }

    const combine = (axisIdx: number): Record<string, string>[] => {
      if (axisIdx >= validAxes.length) return [{}];
      const rest = combine(axisIdx + 1);
      const result: Record<string, string>[] = [];
      validAxes[axisIdx].values.forEach(val => {
        rest.forEach(combo => {
          result.push({ [validAxes[axisIdx].name]: val, ...combo });
        });
      });
      return result;
    };

    const combos = combine(0);
    const newVariants: VariantRow[] = combos.map(combo => {
      const name = Object.values(combo).join(" - ");
      const existing = variants.find(v => v.name === name);
      return existing || {
        name,
        sku: `PROD-${itemId.slice(0, 6)}-${Object.values(combo).map(v => v.toUpperCase().slice(0, 3)).join("-")}`,
        price_adjustment: 0,
        stock_quantity: 0,
        available: true,
        option_values: combo,
      };
    });
    setVariants(newVariants);
  }, [axes, variants, itemId]);

  const updateVariant = (index: number, field: keyof VariantRow, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSave = async () => {
    if (variants.length === 0) return;
    setSaving(true);
    try {
      await db.from("catalog_variants").delete().eq("item_id", itemId);

      const rows = variants.map(v => ({
        item_id: itemId,
        name: v.name,
        sku: v.sku,
        price_adjustment: v.price_adjustment,
        stock_quantity: v.stock_quantity,
        available: v.available,
        option_values: v.option_values,
      }));

      const { error } = await db.from("catalog_variants").insert(rows);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["catalog-variants", itemId] });
      toast.success(`${variants.length} variants saved`);
    } catch (err: any) {
      toast.error("Failed to save variants");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Variants</h4>
        {variants.length > 0 && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save Variants
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {axes.map((axis, ai) => (
          <AppCard key={ai}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{axis.name}</Label>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAxis(ai)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {axis.values.map((val, vi) => (
                  <Badge key={vi} variant="secondary" className="gap-1 text-xs">
                    {val}
                    <button onClick={() => removeValueFromAxis(ai, vi)}><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add value (press Enter)"
                  className="h-8 text-xs"
                  value={tagInputs[ai] || ""}
                  onChange={e => setTagInputs({ ...tagInputs, [ai]: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addValueToAxis(ai); } }}
                />
                <Button size="sm" variant="outline" className="h-8" onClick={() => addValueToAxis(ai)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </AppCard>
        ))}
      </div>

      {axes.length < 3 && (
        <div className="flex gap-2">
          <Input
            placeholder="Axis name (e.g. Size, Color)"
            className="h-8 text-xs"
            value={newAxisName}
            onChange={e => setNewAxisName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAxis(); } }}
          />
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addAxis}>
            <Plus className="h-3 w-3" /> Add Axis
          </Button>
        </div>
      )}

      {axes.some(a => a.values.length > 0) && (
        <Button size="sm" variant="secondary" onClick={generateCombinations} className="w-full">
          Generate Combinations ({axes.reduce((acc, a) => acc * Math.max(a.values.length, 1), 1)})
        </Button>
      )}

      {variants.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 font-medium">Variant</th>
                <th className="text-left p-2 font-medium">SKU</th>
                <th className="text-left p-2 font-medium">Price +/-</th>
                <th className="text-left p-2 font-medium">Stock</th>
                <th className="text-left p-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2 font-medium">{v.name}</td>
                  <td className="p-2">
                    <Input className="h-7 text-xs w-32" value={v.sku} onChange={e => updateVariant(i, "sku", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" className="h-7 text-xs w-20" value={v.price_adjustment} onChange={e => updateVariant(i, "price_adjustment", parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" className="h-7 text-xs w-20" value={v.stock_quantity} onChange={e => updateVariant(i, "stock_quantity", parseInt(e.target.value) || 0)} />
                  </td>
                  <td className="p-2">
                    <Switch checked={v.available} onCheckedChange={val => updateVariant(i, "available", val)} className="scale-75" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {variants.length > 0 && (
        <p className="text-[0.6875rem] text-muted-foreground">
          Base price: {basePrice} AED. Final price per variant = base + adjustment.
        </p>
      )}
    </div>
  );
}
