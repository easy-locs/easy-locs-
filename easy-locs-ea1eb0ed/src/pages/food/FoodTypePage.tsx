/**
 * FoodTypePage — Step 2: Choose cuisine type (delivery or pickup mode)
 * Route: /food/:type (delivery | pickup)
 */
import { useParams, useNavigate } from "react-router-dom";
import UniversePageShell from "@/components/universe/UniversePageShell";
import CategoryCard from "@/components/universe/CategoryCard";
import { UtensilsCrossed } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

const CUISINE_DISPLAY_ORDER = [
  "pizza", "burger", "sushi", "indian", "african", "asian",
  "healthy", "bbq", "seafood", "bakery", "italian", "mexican",
];

const foodCategory = CATEGORY_TREE.find(c => c.key === "food");
const CUISINES = CUISINE_DISPLAY_ORDER
  .map(slug => {
    const sub = foodCategory?.subcategories.find(s => s.value === slug);
    if (!sub) return null;
    return { label: sub.label, icon: sub.emoji, slug: sub.value };
  })
  .filter((c): c is { label: string; icon: string; slug: string } => c !== null);

export default function FoodTypePage() {
  useUiEngine("food-type");
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const mode = type === "pickup" ? "Pickup" : "Delivery";

  return (
    <UniversePageShell
      title={`${mode} — Choose Cuisine`}
      subtitle="What are you in the mood for?"
      icon={<UtensilsCrossed className="h-5 w-5 text-primary-foreground" />}
      seoTitle={`${mode} Food — Choose Cuisine | Easy-Locs`}
      seoDescription={`Browse cuisines for ${mode.toLowerCase()} near you.`}
    >
      <div className="grid grid-cols-3 gap-3">
        {CUISINES.map((c, i) => (
          <CategoryCard
            key={c.slug}
            to={`/food/${type}/${c.slug}`}
            icon={c.icon}
            label={c.label}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
