import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Loader2, AlertTriangle, Flame, Clock, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import ProductMediaUploader from "@/components/storefront/ProductMediaUploader";

const ALL_ALLERGENS = [
  "gluten", "lactose", "nuts", "peanuts", "shellfish", "eggs",
  "soy", "sesame", "celery", "mustard", "fish", "mollusks", "lupin", "sulfites",
];

const ALL_DIETARY_LABELS = [
  "halal", "vegan", "vegetarian", "gluten_free", "lactose_free", "organic", "kosher",
];

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: "\uD83C\uDF3E", lactose: "\uD83E\uDD5B", nuts: "\uD83E\uDD5C",
  peanuts: "\uD83E\uDD5C", shellfish: "\uD83E\uDD90", eggs: "\uD83E\uDD5A",
  soy: "\uD83C\uDF31", sesame: "\uD83C\uDF30", celery: "\uD83E\uDD6C",
  mustard: "\uD83C\uDF2D", fish: "\uD83D\uDC1F", mollusks: "\uD83D\uDC1A",
  lupin: "\uD83C\uDF3B", sulfites: "\uD83C\uDF77",
};

const DIETARY_ICONS: Record<string, string> = {
  halal: "\u262A\uFE0F", vegan: "\uD83C\uDF31", vegetarian: "\uD83E\uDD66",
  gluten_free: "\uD83D\uDEAB", lactose_free: "\uD83D\uDEAB", organic: "\uD83C\uDF3F", kosher: "\u2721\uFE0F",
};

interface DbModifierOption {
  id: string;
  option_name: string;
  price_adjustment: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
}

interface DbModifierGroup {
  id: string;
  group_name: string;
  selection_type: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  sort_order: number;
  menu_modifier_options?: DbModifierOption[];
}

interface ModifierOption {
  id?: string;
  option_name: string;
  price_adjustment: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
  _isNew?: boolean;
  _deleted?: boolean;
}

interface ModifierGroup {
  id?: string;
  group_name: string;
  selection_type: "radio" | "checkbox";
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  sort_order: number;
  options: ModifierOption[];
  _isNew?: boolean;
  _deleted?: boolean;
}

interface MenuItemPatch {
  name: string;
  name_fr: string | null;
  name_ar: string | null;
  description: string | null;
  description_fr: string | null;
  description_ar: string | null;
  price: number;
  compare_at_price: number | null;
  category: string | null;
  is_available: boolean;
  allergens: string[];
  dietary_labels: string[];
  spice_level: number;
  prep_time_minutes: number;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_urls: string[];
  video_url: string | null;
  cover_index: number;
  updated_at: string;
}

export default function MerchantMenuItemEditorPage() {
  useUiEngine("merchant-menu-item-editor");
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const [allergens, setAllergens] = useState<string[]>([]);
  const [dietaryLabels, setDietaryLabels] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState(0);
  const [prepTime, setPrepTime] = useState(15);
  const [caloriesKcal, setCaloriesKcal] = useState<string>("");
  const [proteinG, setProteinG] = useState<string>("");
  const [carbsG, setCarbsG] = useState<string>("");
  const [fatG, setFatG] = useState<string>("");

  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [coverIndex, setCoverIndex] = useState(0);

  const { data: menuItem, isLoading } = useQuery({
    queryKey: ["menu-item-edit", itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await db
        .from("menu_items")
        .select("*")
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  const { data: existingGroups } = useQuery({
    queryKey: ["modifier-groups", itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data } = await db
        .from("menu_modifier_groups")
        .select("*, menu_modifier_options(*)")
        .eq("menu_item_id", itemId)
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!itemId,
  });

  useEffect(() => {
    if (menuItem) {
      setName(menuItem.name ?? "");
      setNameFr(menuItem.name_fr ?? "");
      setNameAr(menuItem.name_ar ?? "");
      setDescription(menuItem.description ?? "");
      setDescriptionFr(menuItem.description_fr ?? "");
      setDescriptionAr(menuItem.description_ar ?? "");
      setPrice(String(menuItem.price ?? ""));
      setCompareAtPrice(menuItem.compare_at_price != null ? String(menuItem.compare_at_price) : "");
      setCategory(menuItem.category ?? "");
      setIsAvailable(menuItem.is_available ?? true);
      setAllergens(menuItem.allergens ?? []);
      setDietaryLabels(menuItem.dietary_labels ?? []);
      setSpiceLevel(menuItem.spice_level ?? 0);
      setPrepTime(menuItem.prep_time_minutes ?? 15);
      setCaloriesKcal(menuItem.calories_kcal != null ? String(menuItem.calories_kcal) : "");
      setProteinG(menuItem.protein_g != null ? String(menuItem.protein_g) : "");
      setCarbsG(menuItem.carbs_g != null ? String(menuItem.carbs_g) : "");
      setFatG(menuItem.fat_g != null ? String(menuItem.fat_g) : "");

      const rawImages = menuItem.images ?? menuItem.image_urls ?? [];
      setImages(Array.isArray(rawImages) ? rawImages : []);
      setVideoUrl(menuItem.video_url ?? "");
      setCoverIndex(menuItem.cover_index ?? 0);
    }
  }, [menuItem]);

  useEffect(() => {
    if (existingGroups?.length) {
      setModifierGroups(
        (existingGroups as DbModifierGroup[]).map((g) => ({
          id: g.id,
          group_name: g.group_name,
          selection_type: g.selection_type as "radio" | "checkbox",
          is_required: g.is_required,
          min_selections: g.min_selections,
          max_selections: g.max_selections,
          sort_order: g.sort_order,
          options: (g.menu_modifier_options ?? [])
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((o) => ({
              id: o.id,
              option_name: o.option_name,
              price_adjustment: Number(o.price_adjustment),
              is_default: o.is_default,
              is_available: o.is_available,
              sort_order: o.sort_order,
            })),
        }))
      );
    }
  }, [existingGroups]);

  const toggleAllergen = (a: string) => {
    setAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const toggleDietary = (d: string) => {
    setDietaryLabels((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const addModifierGroup = () => {
    setModifierGroups((prev) => [
      ...prev,
      {
        group_name: "",
        selection_type: "checkbox",
        is_required: false,
        min_selections: 0,
        max_selections: 10,
        sort_order: prev.length,
        options: [],
        _isNew: true,
      },
    ]);
  };

  const removeModifierGroup = (idx: number) => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      if (copy[idx].id) {
        copy[idx] = { ...copy[idx], _deleted: true };
      } else {
        copy.splice(idx, 1);
      }
      return copy;
    });
  };

  const updateGroup = (idx: number, patch: Partial<ModifierGroup>) => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const addOption = (groupIdx: number) => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      copy[groupIdx] = {
        ...copy[groupIdx],
        options: [
          ...copy[groupIdx].options,
          {
            option_name: "",
            price_adjustment: 0,
            is_default: false,
            is_available: true,
            sort_order: copy[groupIdx].options.length,
            _isNew: true,
          },
        ],
      };
      return copy;
    });
  };

  const removeOption = (groupIdx: number, optIdx: number) => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      const opts = [...copy[groupIdx].options];
      if (opts[optIdx].id) {
        opts[optIdx] = { ...opts[optIdx], _deleted: true };
      } else {
        opts.splice(optIdx, 1);
      }
      copy[groupIdx] = { ...copy[groupIdx], options: opts };
      return copy;
    });
  };

  const updateOption = (
    groupIdx: number,
    optIdx: number,
    patch: Partial<ModifierOption>
  ) => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      const opts = [...copy[groupIdx].options];
      opts[optIdx] = { ...opts[optIdx], ...patch };
      copy[groupIdx] = { ...copy[groupIdx], options: opts };
      return copy;
    });
  };

  const moveOption = (groupIdx: number, optIdx: number, direction: "up" | "down") => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      const opts = [...copy[groupIdx].options];
      const targetIdx = direction === "up" ? optIdx - 1 : optIdx + 1;
      if (targetIdx < 0 || targetIdx >= opts.length) return prev;
      [opts[optIdx], opts[targetIdx]] = [opts[targetIdx], opts[optIdx]];
      opts.forEach((o, i) => { o.sort_order = i; });
      copy[groupIdx] = { ...copy[groupIdx], options: opts };
      return copy;
    });
  };

  const moveGroup = (idx: number, direction: "up" | "down") => {
    setModifierGroups((prev) => {
      const copy = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      copy.forEach((g, i) => { g.sort_order = i; });
      return copy;
    });
  };

  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    if (!itemId || !name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const patch: MenuItemPatch = {
        name: name.trim(),
        name_fr: nameFr.trim() || null,
        name_ar: nameAr.trim() || null,
        description: description.trim() || null,
        description_fr: descriptionFr.trim() || null,
        description_ar: descriptionAr.trim() || null,
        price: Number(price) || 0,
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        category: category.trim() || null,
        is_available: isAvailable,
        allergens,
        dietary_labels: dietaryLabels,
        spice_level: spiceLevel,
        prep_time_minutes: prepTime,
        calories_kcal: caloriesKcal ? Number(caloriesKcal) : null,
        protein_g: proteinG ? Number(proteinG) : null,
        carbs_g: carbsG ? Number(carbsG) : null,
        fat_g: fatG ? Number(fatG) : null,
        image_urls: images,
        video_url: videoUrl || null,
        cover_index: coverIndex,
        updated_at: new Date().toISOString(),
      };

      const { error: itemErr } = await db
        .from("menu_items")
        .update(patch)
        .eq("id", itemId);
      if (itemErr) throw itemErr;

      for (const group of modifierGroups) {
        if (group._deleted && group.id) {
          await db.from("menu_modifier_groups").delete().eq("id", group.id);
          continue;
        }
        if (group._deleted) continue;

        const groupPayload = {
          menu_item_id: itemId,
          group_name: group.group_name,
          selection_type: group.selection_type,
          is_required: group.is_required,
          min_selections: group.min_selections,
          max_selections: group.max_selections,
          sort_order: group.sort_order,
        };

        let groupId = group.id;
        if (group._isNew || !group.id) {
          const { data: newGroup, error } = await db
            .from("menu_modifier_groups")
            .insert(groupPayload)
            .select("id")
            .single();
          if (error) throw error;
          groupId = newGroup.id;
        } else {
          const { error } = await db
            .from("menu_modifier_groups")
            .update(groupPayload)
            .eq("id", group.id);
          if (error) throw error;
        }

        for (const opt of group.options) {
          if (opt._deleted && opt.id) {
            await db.from("menu_modifier_options").delete().eq("id", opt.id);
            continue;
          }
          if (opt._deleted) continue;

          const optPayload = {
            group_id: groupId,
            option_name: opt.option_name,
            price_adjustment: opt.price_adjustment,
            is_default: opt.is_default,
            is_available: opt.is_available,
            sort_order: opt.sort_order,
          };

          if (opt._isNew || !opt.id) {
            const { error } = await db
              .from("menu_modifier_options")
              .insert(optPayload);
            if (error) throw error;
          } else {
            const { error } = await db
              .from("menu_modifier_options")
              .update(optPayload)
              .eq("id", opt.id);
            if (error) throw error;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["menu-item-edit", itemId] });
      queryClient.invalidateQueries({ queryKey: ["modifier-groups", itemId] });
      queryClient.invalidateQueries({ queryKey: ["merchant-menu-products"] });
      toast.success("Dish saved successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SubPageShell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-5 pb-32">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">Edit Dish</h1>
        </div>

        {/* Media */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
            Photos &amp; Video
          </p>
          <ProductMediaUploader
            images={images}
            videoUrl={videoUrl}
            coverIndex={coverIndex}
            onImagesChange={setImages}
            onVideoChange={setVideoUrl}
            onCoverChange={setCoverIndex}
          />
        </section>

        {/* Identity */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
            Identity
          </p>
          <div>
            <label className="text-xs font-medium text-foreground">Name (EN)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Name (FR)</label>
              <input
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                placeholder="Nom en français"
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Name (AR)</label>
              <input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="الاسم بالعربية"
                dir="rtl"
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">
              Description (EN)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm resize-none h-20 bg-muted/30 border border-border/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Description (FR)</label>
              <textarea
                value={descriptionFr}
                onChange={(e) => setDescriptionFr(e.target.value)}
                placeholder="Description en français"
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm resize-none h-16 bg-muted/30 border border-border/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description (AR)</label>
              <textarea
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder="الوصف بالعربية"
                dir="rtl"
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm resize-none h-16 bg-muted/30 border border-border/10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">
                Price (AED)
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Compare-at Price
              </label>
              <input
                type="number"
                step="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="Original price"
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`rounded-full px-3 py-1 text-[0.6875rem] font-bold transition-colors ${
                isAvailable
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </button>
          </div>
        </section>

        {/* Allergens */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Allergens
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_ALLERGENS.map((a) => (
              <button
                key={a}
                onClick={() => toggleAllergen(a)}
                className="px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold capitalize transition-all active:scale-95"
                style={{
                  background: allergens.includes(a)
                    ? "hsl(0 72% 51% / 0.15)"
                    : "hsl(var(--muted))",
                  color: allergens.includes(a)
                    ? "hsl(0 72% 51%)"
                    : "hsl(var(--foreground))",
                  border: allergens.includes(a)
                    ? "1px solid hsl(0 72% 51% / 0.3)"
                    : "1px solid transparent",
                }}
              >
                {ALLERGEN_ICONS[a] ?? ""} {a}
              </button>
            ))}
          </div>
        </section>

        {/* Dietary Labels */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
            Dietary Labels
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DIETARY_LABELS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDietary(d)}
                className="px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold capitalize transition-all active:scale-95"
                style={{
                  background: dietaryLabels.includes(d)
                    ? "hsl(142 72% 29% / 0.15)"
                    : "hsl(var(--muted))",
                  color: dietaryLabels.includes(d)
                    ? "hsl(142 72% 29%)"
                    : "hsl(var(--foreground))",
                  border: dietaryLabels.includes(d)
                    ? "1px solid hsl(142 72% 29% / 0.3)"
                    : "1px solid transparent",
                }}
              >
                {DIETARY_ICONS[d] ?? ""} {d.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </section>

        {/* Nutritional Info */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
            Nutritional Info
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <Flame className="w-3 h-3" /> Spice Level (0-5)
              </label>
              <div className="flex items-center gap-2 mt-1">
                {[0, 1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSpiceLevel(lvl)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all active:scale-90"
                    style={{
                      background:
                        spiceLevel >= lvl && lvl > 0
                          ? "hsl(0 72% 51% / 0.15)"
                          : "hsl(var(--muted))",
                    }}
                  >
                    {lvl === 0 ? "0" : "🌶️"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Prep time (min)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value) || 0)}
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  value={caloriesKcal}
                  onChange={(e) => setCaloriesKcal(e.target.value)}
                  placeholder="320"
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm bg-muted/30 border border-border/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={proteinG}
                  onChange={(e) => setProteinG(e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2 text-sm bg-muted/30 border border-border/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={carbsG}
                  onChange={(e) => setCarbsG(e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2 text-sm bg-muted/30 border border-border/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={fatG}
                  onChange={(e) => setFatG(e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2 text-sm bg-muted/30 border border-border/10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Modifier Groups */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
              Modifier Groups
            </p>
            <button
              onClick={addModifierGroup}
              className="text-xs font-bold text-primary flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Add Group
            </button>
          </div>

          {modifierGroups
            .filter((g) => !g._deleted)
            .map((group, gIdx) => {
              const actualIdx = modifierGroups.indexOf(group);
              return (
                <div
                  key={group.id ?? `new-${gIdx}`}
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    border: "1px solid hsl(var(--border) / 0.1)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => moveGroup(actualIdx, "up")} className="text-muted-foreground hover:text-foreground active:scale-90" disabled={gIdx === 0}>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveGroup(actualIdx, "down")} className="text-muted-foreground hover:text-foreground active:scale-90">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={group.group_name}
                      onChange={(e) =>
                        updateGroup(actualIdx, { group_name: e.target.value })
                      }
                      placeholder="Group name (e.g. Size, Extras)"
                      className="flex-1 rounded-lg px-2.5 py-1.5 text-sm bg-background border border-border/10"
                    />
                    <button
                      onClick={() => removeModifierGroup(actualIdx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive active:scale-90 bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={group.selection_type}
                      onChange={(e) =>
                        updateGroup(actualIdx, {
                          selection_type: e.target.value as "radio" | "checkbox",
                        })
                      }
                      className="rounded-lg px-2 py-1 text-[0.6875rem] bg-background border border-border/10"
                    >
                      <option value="radio">Radio (single)</option>
                      <option value="checkbox">Checkbox (multi)</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-[0.6875rem]">
                      <input
                        type="checkbox"
                        checked={group.is_required}
                        onChange={(e) =>
                          updateGroup(actualIdx, {
                            is_required: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      Required
                    </label>
                    {group.selection_type === "checkbox" && (
                      <label className="flex items-center gap-1 text-[0.6875rem]">
                        Max:
                        <input
                          type="number"
                          value={group.max_selections}
                          onChange={(e) =>
                            updateGroup(actualIdx, {
                              max_selections: Number(e.target.value) || 10,
                            })
                          }
                          className="w-12 rounded px-1.5 py-0.5 text-[0.6875rem] bg-background border border-border/10"
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1">
                    {group.options
                      .filter((o) => !o._deleted)
                      .map((opt, oIdx) => {
                        const actualOptIdx = group.options.indexOf(opt);
                        return (
                          <div
                            key={opt.id ?? `opt-${oIdx}`}
                            className="flex items-center gap-2"
                          >
                            <div className="flex flex-col shrink-0">
                              <button onClick={() => moveOption(actualIdx, actualOptIdx, "up")} className="text-muted-foreground hover:text-foreground active:scale-90" disabled={oIdx === 0}>
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button onClick={() => moveOption(actualIdx, actualOptIdx, "down")} className="text-muted-foreground hover:text-foreground active:scale-90">
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              value={opt.option_name}
                              onChange={(e) =>
                                updateOption(actualIdx, actualOptIdx, {
                                  option_name: e.target.value,
                                })
                              }
                              placeholder="Option name"
                              className="flex-1 rounded-lg px-2 py-1.5 text-xs bg-background border border-border/10"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[0.625rem] text-muted-foreground">
                                +
                              </span>
                              <input
                                type="number"
                                step="0.5"
                                value={opt.price_adjustment}
                                onChange={(e) =>
                                  updateOption(actualIdx, actualOptIdx, {
                                    price_adjustment:
                                      Number(e.target.value) || 0,
                                  })
                                }
                                className="w-16 rounded-lg px-2 py-1.5 text-xs bg-background border border-border/10"
                              />
                            </div>
                            <label className="flex items-center text-[0.625rem] gap-0.5">
                              <input
                                type="checkbox"
                                checked={opt.is_available}
                                onChange={(e) =>
                                  updateOption(actualIdx, actualOptIdx, {
                                    is_available: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              On
                            </label>
                            <button
                              onClick={() =>
                                removeOption(actualIdx, actualOptIdx)
                              }
                              className="w-6 h-6 rounded flex items-center justify-center text-destructive active:scale-90"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    <button
                      onClick={() => addOption(actualIdx)}
                      className="text-[0.6875rem] font-bold text-primary flex items-center gap-1 mt-1 active:scale-95"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  </div>
                </div>
              );
            })}
        </section>

        {/* Customer Preview */}
        <section className="rounded-2xl p-4 bg-card border border-border/20 space-y-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Eye className="w-4 h-4 text-primary" />
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex-1">
              Customer Preview
            </p>
            <span className="text-[0.625rem] text-primary font-bold">
              {showPreview ? "Hide" : "Show"}
            </span>
          </button>

          {showPreview && (
            <div className="rounded-2xl border border-primary/20 bg-background overflow-hidden">
              {images.length > 0 && (
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={images[coverIndex] ?? images[0]}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="text-base font-bold">{name || "Dish Name"}</h3>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="font-bold">{Number(price || 0).toFixed(2)} AED</span>
                      {compareAtPrice && Number(compareAtPrice) > Number(price) && (
                        <span className="line-through opacity-60">{Number(compareAtPrice).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="p-3 space-y-2">
                {!images.length && (
                  <div>
                    <h3 className="text-sm font-bold">{name || "Dish Name"}</h3>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="font-bold">{Number(price || 0).toFixed(2)} AED</span>
                      {compareAtPrice && Number(compareAtPrice) > Number(price) && (
                        <span className="line-through text-muted-foreground">{Number(compareAtPrice).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {spiceLevel > 0 && (
                    <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                      {"🌶️".repeat(spiceLevel)} Spice
                    </span>
                  )}
                  {prepTime > 0 && (
                    <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                      ⏱ {prepTime} min
                    </span>
                  )}
                  {caloriesKcal && (
                    <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                      {caloriesKcal} kcal
                    </span>
                  )}
                </div>
                {allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {allergens.map((a) => (
                      <span key={a} className="text-[0.5625rem] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                        {ALLERGEN_ICONS[a] ?? ""} {a}
                      </span>
                    ))}
                  </div>
                )}
                {dietaryLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dietaryLabels.map((d) => (
                      <span key={d} className="text-[0.5625rem] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        {DIETARY_ICONS[d] ?? ""} {d}
                      </span>
                    ))}
                  </div>
                )}
                {modifierGroups.filter((g) => !g._deleted && g.group_name).length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-border/10">
                    {modifierGroups.filter((g) => !g._deleted && g.group_name).map((g, i) => (
                      <div key={i}>
                        <p className="text-[0.625rem] font-bold text-foreground">
                          {g.group_name} {g.is_required && <span className="text-destructive">*</span>}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {g.options.filter((o) => !o._deleted && o.is_available).map((o, j) => (
                            <span key={j} className="text-[0.5625rem] px-2 py-0.5 rounded-full border border-border/20 text-muted-foreground">
                              {o.option_name}{o.price_adjustment > 0 ? ` +${o.price_adjustment}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Save button */}
        <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t border-border/10 z-40" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full max-w-lg mx-auto rounded-2xl h-12 text-sm font-bold flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Dish
          </Button>
        </div>
      </div>
    </SubPageShell>
  );
}
