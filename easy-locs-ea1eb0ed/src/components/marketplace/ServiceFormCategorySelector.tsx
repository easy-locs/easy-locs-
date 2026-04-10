/**
 * ServiceFormCategorySelector — Category → Subcategory hierarchy selector for ServiceForm.
 * Uses the unified CATEGORY_HIERARCHY taxonomy.
 */
import { CATEGORY_HIERARCHY, type CategoryGroupCompat as CategoryGroup, type SubCategoryCompat as SubCategory } from "@/lib/taxonomy/category-tree";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  category: string;
  onCategoryChange: (category: string) => void;
}

export default function ServiceFormCategorySelector({ category, onCategoryChange }: Props) {
  // Find current parent group for the selected category
  const currentGroup = CATEGORY_HIERARCHY.find(g =>
    g.subcategories.some(s => s.value === category)
  );
  const selectedGroupValue = currentGroup?.value || "";

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Parent Category */}
      <div>
        <Label>Category *</Label>
        <Select
          value={selectedGroupValue}
          onValueChange={(groupVal) => {
            const group = CATEGORY_HIERARCHY.find(g => g.value === groupVal);
            if (group && group.subcategories.length > 0) {
              onCategoryChange(group.subcategories[0].value);
            }
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {CATEGORY_HIERARCHY.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.emoji} {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory */}
      <div>
        <Label>Subcategory *</Label>
        <Select
          value={category}
          onValueChange={onCategoryChange}
          disabled={!currentGroup}
        >
          <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
          <SelectContent>
            {(currentGroup?.subcategories || []).map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
