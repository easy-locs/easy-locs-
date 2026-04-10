/**
 * TaxonomySelector — Cascading vertical → cluster → subcategory picker.
 * Uses the canonical world-class-taxonomy as single source of truth.
 */
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORLD_TAXONOMY } from "@/lib/taxonomy/world-class-taxonomy";
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";

interface TaxonomySelectorProps {
  vertical: string;
  cluster: string;
  subcategory: string;
  onVerticalChange: (v: string) => void;
  onClusterChange: (c: string) => void;
  onSubcategoryChange: (s: string) => void;
  compact?: boolean;
}

export default function TaxonomySelector({
  vertical, cluster, subcategory,
  onVerticalChange, onClusterChange, onSubcategoryChange,
  compact = false,
}: TaxonomySelectorProps) {
  const verticalDef = useMemo(
    () => WORLD_TAXONOMY.find(v => v.value === vertical),
    [vertical]
  );

  const clusters = verticalDef?.clusters ?? [];
  const subcategories = useMemo(
    () => cluster
      ? (verticalDef?.subcategories.filter(s => s.cluster === cluster) ?? [])
      : (verticalDef?.subcategories ?? []),
    [verticalDef, cluster]
  );

  const labelClass = compact ? "text-[10px]" : "text-xs";
  const triggerClass = compact ? "mt-1 h-9 text-xs" : "mt-1.5 h-11";

  return (
    <div className="space-y-3">
      {/* Vertical */}
      <div>
        <Label className={labelClass}>Business Type *</Label>
        <Select value={vertical} onValueChange={v => {
          onVerticalChange(v);
          onClusterChange("");
          onSubcategoryChange("");
        }}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {WORLD_TAXONOMY.map(v => (
              <SelectItem key={v.value} value={v.value}>
                {v.emoji} {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cluster */}
      {clusters.length > 0 && (
        <div>
          <Label className={labelClass}>Category</Label>
          <Select value={cluster} onValueChange={c => {
            onClusterChange(c);
            onSubcategoryChange("");
          }}>
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {clusters.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Subcategory */}
      {subcategories.length > 0 && (
        <div>
          <Label className={labelClass}>Subcategory</Label>
          <Select value={subcategory} onValueChange={onSubcategoryChange}>
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.emoji} {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
