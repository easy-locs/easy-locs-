import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Minus, AlertTriangle, Clock, Flame } from "lucide-react";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import type { CartModifier } from "@/stores/cartStore";

interface ModifierOption {
  id: string;
  option_name: string;
  price_adjustment: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
}

interface ModifierGroup {
  id: string;
  group_name: string;
  selection_type: "radio" | "checkbox";
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  sort_order: number;
  options: ModifierOption[];
}

interface DishItem {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  calories?: number;
  allergens?: string[];
  dietary_labels?: string[];
  spice_level?: number;
  prep_time_minutes?: number;
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DishItem | null;
  modifierGroups: ModifierGroup[];
  currency?: string;
  country?: string;
  onAddToCart: (params: {
    quantity: number;
    modifiers: CartModifier[];
    notes: string;
    totalPrice: number;
  }) => void;
}

const ALLERGEN_LABELS: Record<string, { emoji: string; label: string }> = {
  gluten: { emoji: "\uD83C\uDF3E", label: "Gluten" },
  lactose: { emoji: "\uD83E\uDD5B", label: "Lactose" },
  nuts: { emoji: "\uD83E\uDD5C", label: "Nuts" },
  peanuts: { emoji: "\uD83E\uDD5C", label: "Peanuts" },
  shellfish: { emoji: "\uD83E\uDD90", label: "Shellfish" },
  eggs: { emoji: "\uD83E\uDD5A", label: "Eggs" },
  soy: { emoji: "\uD83C\uDF31", label: "Soy" },
  sesame: { emoji: "\uD83C\uDF30", label: "Sesame" },
  celery: { emoji: "\uD83E\uDD6C", label: "Celery" },
  mustard: { emoji: "\uD83C\uDF2D", label: "Mustard" },
  fish: { emoji: "\uD83D\uDC1F", label: "Fish" },
  mollusks: { emoji: "\uD83D\uDC1A", label: "Mollusks" },
  lupin: { emoji: "\uD83C\uDF3B", label: "Lupin" },
  sulfites: { emoji: "\uD83C\uDF77", label: "Sulfites" },
};

const DIETARY_LABELS: Record<string, { emoji: string; label: string }> = {
  halal: { emoji: "\u262A\uFE0F", label: "Halal" },
  vegan: { emoji: "\uD83C\uDF31", label: "Vegan" },
  vegetarian: { emoji: "\uD83E\uDD66", label: "Vegetarian" },
  gluten_free: { emoji: "\uD83D\uDEAB\uD83C\uDF3E", label: "Gluten Free" },
  lactose_free: { emoji: "\uD83D\uDEAB\uD83E\uDD5B", label: "Lactose Free" },
  organic: { emoji: "\uD83C\uDF3F", label: "Organic" },
  kosher: { emoji: "\u2721\uFE0F", label: "Kosher" },
};

export default function DishCustomizationSheet({
  open,
  onOpenChange,
  item,
  modifierGroups,
  currency = "AED",
  country = "AE",
  onAddToCart,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({});
  const [specialNotes, setSpecialNotes] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSpecialNotes("");
      const defaults: Record<string, string[]> = {};
      for (const group of modifierGroups) {
        const defaultOpts = group.options
          .filter((o) => o.is_default && o.is_available)
          .map((o) => o.id);
        if (defaultOpts.length > 0) {
          defaults[group.id] = group.selection_type === "radio"
            ? [defaultOpts[0]]
            : defaultOpts;
        }
      }
      setSelectedOptions(defaults);
    }
  }, [open, item?.id, modifierGroups]);

  const sortedGroups = useMemo(
    () => [...modifierGroups].sort((a, b) => a.sort_order - b.sort_order),
    [modifierGroups]
  );

  const handleOptionToggle = (group: ModifierGroup, optionId: string) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selection_type === "radio") {
        return { ...prev, [group.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max_selections) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const modifiersTotal = useMemo(() => {
    let total = 0;
    for (const group of modifierGroups) {
      const selected = selectedOptions[group.id] ?? [];
      for (const opt of group.options) {
        if (selected.includes(opt.id)) {
          total += Number(opt.price_adjustment) || 0;
        }
      }
    }
    return total;
  }, [selectedOptions, modifierGroups]);

  const unitPrice = (item?.price ?? 0) + modifiersTotal;
  const totalPrice = unitPrice * quantity;

  const isValid = useMemo(() => {
    for (const group of modifierGroups) {
      if (group.is_required) {
        const selected = selectedOptions[group.id] ?? [];
        if (selected.length < Math.max(group.min_selections, 1)) return false;
      }
    }
    return true;
  }, [selectedOptions, modifierGroups]);

  const handleAdd = () => {
    if (!item || !isValid) return;

    const modifiers: CartModifier[] = [];
    for (const group of modifierGroups) {
      const selected = selectedOptions[group.id] ?? [];
      for (const opt of group.options) {
        if (selected.includes(opt.id)) {
          modifiers.push({
            groupName: group.group_name,
            optionName: opt.option_name,
            priceAdjustment: Number(opt.price_adjustment) || 0,
          });
        }
      }
    }

    onAddToCart({
      quantity,
      modifiers,
      notes: specialNotes.trim(),
      totalPrice,
    });

    setQuantity(1);
    setSelectedOptions({});
    setSpecialNotes("");
    onOpenChange(false);
  };

  const fmt = (n: number) => formatMoneyByCountry(n, country, currency);

  if (!item) return null;

  const allergens = item.allergens ?? [];
  const dietaryLabels = item.dietary_labels ?? [];
  const spiceLevel = item.spice_level ?? 0;
  const prepTime = item.prep_time_minutes ?? 0;
  const calories = item.calories_kcal ?? item.calories ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[90dvh] overflow-y-auto pb-safe p-0"
      >
        {item.image && (
          <div className="w-full h-48 relative">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, hsl(var(--background)), transparent 50%)",
              }}
            />
          </div>
        )}

        <div className="px-4 pt-3 pb-2">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">
              {item.name}
            </SheetTitle>
          </SheetHeader>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {item.description}
            </p>
          )}

          <p className="text-base font-bold mt-2">{fmt(Number(item.price))}</p>
        </div>

        {allergens.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Allergens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allergens.map((a) => {
                const info = ALLERGEN_LABELS[a];
                return (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: "hsl(0 72% 51% / 0.1)",
                      color: "hsl(0 72% 51%)",
                    }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {info?.label ?? a}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {dietaryLabels.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Dietary
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dietaryLabels.map((d) => {
                const info = DIETARY_LABELS[d];
                return (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: "hsl(142 72% 29% / 0.1)",
                      color: "hsl(142 72% 29%)",
                    }}
                  >
                    {info?.emoji ?? ""} {info?.label ?? d}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {(spiceLevel > 0 || calories > 0 || prepTime > 0) && (
          <div className="px-4 py-2 flex items-center gap-3 flex-wrap">
            {spiceLevel > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                {Array.from({ length: spiceLevel }, (_, i) => (
                  <span key={i} className="text-red-500">
                    🌶️
                  </span>
                ))}
              </span>
            )}
            {calories > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {calories} kcal
              </span>
            )}
            {prepTime > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />~{prepTime} min
              </span>
            )}
          </div>
        )}

        {item.protein_g != null || item.carbs_g != null || item.fat_g != null ? (
          <div className="px-4 py-2 flex items-center gap-3">
            {item.protein_g != null && (
              <span className="text-[11px] text-muted-foreground">
                Protein: {item.protein_g}g
              </span>
            )}
            {item.carbs_g != null && (
              <span className="text-[11px] text-muted-foreground">
                Carbs: {item.carbs_g}g
              </span>
            )}
            {item.fat_g != null && (
              <span className="text-[11px] text-muted-foreground">
                Fat: {item.fat_g}g
              </span>
            )}
          </div>
        ) : null}

        {sortedGroups.map((group) => {
          const selected = selectedOptions[group.id] ?? [];
          return (
            <div key={group.id} className="px-4 py-3 border-t border-border/10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-foreground">
                  {group.group_name}
                </p>
                {group.is_required && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                    Required
                  </span>
                )}
                {group.selection_type === "checkbox" &&
                  group.max_selections < 10 && (
                    <span className="text-[10px] text-muted-foreground">
                      (max {group.max_selections})
                    </span>
                  )}
              </div>
              <div className="space-y-1.5">
                {group.options
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((opt) => {
                    const isSelected = selected.includes(opt.id);
                    const isDisabled = !opt.is_available;
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          !isDisabled && handleOptionToggle(group, opt.id)
                        }
                        disabled={isDisabled}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.98] transition-all"
                        style={{
                          background: isSelected
                            ? "hsl(var(--primary) / 0.08)"
                            : "hsl(var(--muted) / 0.3)",
                          border: `1px solid ${
                            isSelected
                              ? "hsl(var(--primary) / 0.3)"
                              : "transparent"
                          }`,
                          opacity: isDisabled ? 0.4 : 1,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{
                            borderColor: isSelected
                              ? "hsl(var(--primary))"
                              : "hsl(var(--border))",
                            borderRadius:
                              group.selection_type === "checkbox"
                                ? "6px"
                                : "50%",
                          }}
                        >
                          {isSelected && (
                            <div
                              className="w-2.5 h-2.5"
                              style={{
                                background: "hsl(var(--primary))",
                                borderRadius:
                                  group.selection_type === "checkbox"
                                    ? "3px"
                                    : "50%",
                              }}
                            />
                          )}
                        </div>
                        <span className="flex-1 text-left text-sm font-medium text-foreground">
                          {opt.option_name}
                          {isDisabled && (
                            <span className="text-muted-foreground ml-1">
                              (unavailable)
                            </span>
                          )}
                        </span>
                        {Number(opt.price_adjustment) !== 0 && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {Number(opt.price_adjustment) > 0 ? "+" : ""}
                            {fmt(Number(opt.price_adjustment))}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}

        <div className="px-4 py-3 border-t border-border/10">
          <p className="text-sm font-bold text-foreground mb-1.5">
            Special instructions
          </p>
          <textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value.slice(0, 200))}
            placeholder="E.g. no sauce, extra spicy..."
            className="w-full rounded-xl p-3 text-sm resize-none h-16 bg-muted/30 border border-border/10"
            maxLength={200}
          />
          <p className="text-[10px] text-muted-foreground text-right mt-0.5">
            {specialNotes.length}/200
          </p>
        </div>

        <div className="px-4 pb-6 pt-2 space-y-3 border-t border-border/10">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform bg-muted"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold w-8 text-center tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full rounded-2xl h-12 text-sm font-bold"
          >
            Add to cart — {fmt(totalPrice)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
