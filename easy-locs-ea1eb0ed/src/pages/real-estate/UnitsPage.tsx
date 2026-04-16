import { useState } from "react";
import { useProperties, usePropertyUnits } from "@/hooks/useRealEstate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, BedDouble, Bath, Ruler } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function UnitsPage() {
  useUiEngine("real-estate-unitspage");
  const { data: properties, isLoading: propsLoading } = useProperties();
  const [selectedProp, setSelectedProp] = useState<string>("");
  const { data: units, isLoading: unitsLoading } = usePropertyUnits(selectedProp || undefined);

  const loading = propsLoading || (!!selectedProp && unitsLoading);

  return (
    <div className="space-y-4">
      <Select value={selectedProp} onValueChange={setSelectedProp}>
        <SelectTrigger className="bg-card border-border/50">
          <SelectValue placeholder="Select a property" />
        </SelectTrigger>
        <SelectContent>
          {properties?.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.label} — {p.city}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedProp && (
        <div className="text-center py-16">
          <Home className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Select a property to view its units.</p>
        </div>
      )}

      {loading && <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}

      {selectedProp && !unitsLoading && units?.length === 0 && (
        <div className="text-center py-12">
          <Home className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No units for this property.</p>
        </div>
      )}

      <div className="grid gap-3">
        {units?.map((u) => (
          <AppCard key={u.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">Unit {u.unit_number || "—"}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {u.floor != null && <span>Floor {u.floor}</span>}
                  {u.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{u.bedrooms}</span>}
                  {u.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{u.bathrooms}</span>}
                  {u.size_sqm != null && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{u.size_sqm}m²</span>}
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                {u.rent_amount != null && u.rent_amount > 0 && <span className="text-sm font-bold">{u.rent_amount} {u.currency}</span>}
                <Badge variant="outline" className="text-[0.625rem] capitalize">{u.status}</Badge>
              </div>
            </CardContent>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
