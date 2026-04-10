/**
 * FoodTypePage — Step 2: Choose cuisine type (delivery or pickup mode)
 * Route: /food/:type (delivery | pickup)
 */
import { useParams, useNavigate } from "react-router-dom";
import UniversePageShell from "@/components/universe/UniversePageShell";
import CategoryCard from "@/components/universe/CategoryCard";
import { UtensilsCrossed } from "lucide-react";

const CUISINES = [
  { label: "Pizza", icon: "🍕", slug: "pizza" },
  { label: "Burger", icon: "🍔", slug: "burger" },
  { label: "Sushi", icon: "🍣", slug: "sushi" },
  { label: "Indian", icon: "🍛", slug: "indian" },
  { label: "African", icon: "🥘", slug: "african" },
  { label: "Asian", icon: "🍜", slug: "asian" },
  { label: "Healthy", icon: "🥗", slug: "healthy" },
  { label: "Grill", icon: "🥩", slug: "grill" },
  { label: "Seafood", icon: "🦐", slug: "seafood" },
  { label: "Bakery", icon: "🥐", slug: "bakery" },
  { label: "Italian", icon: "🍝", slug: "italian" },
  { label: "Mexican", icon: "🌮", slug: "mexican" },
];

export default function FoodTypePage() {
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
