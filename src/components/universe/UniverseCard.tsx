/**
 * UniverseCard — Premium tappable card for universe hubs.
 * Composed from atomic card micro-components.
 */
import { CardShell } from "@/components/cards/CardShell";
import { CardMedia } from "@/components/cards/CardMedia";
import { CardIdentity } from "@/components/cards/CardIdentity";
import { CardSignals } from "@/components/cards/CardSignals";
import { CardCommerce } from "@/components/cards/CardCommerce";

interface UniverseCardProps {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  rating?: number;
  badge?: string;
  price?: string;
  eta?: string;
  distance?: string;
  className?: string;
  index?: number;
  variant?: "vertical" | "horizontal";
}

export default function UniverseCard({
  to,
  image,
  title,
  subtitle,
  rating,
  badge,
  price,
  eta,
  distance,
  className,
  index = 0,
  variant = "horizontal",
}: UniverseCardProps) {
  if (variant === "vertical") {
    return (
      <CardShell to={to} className={className} index={index} layout="vertical">
        <CardMedia image={image} alt={title} badge={badge} layout="vertical" />
        <div className="p-3 space-y-1">
          <CardIdentity title={title} subtitle={subtitle} />
          <div className="flex items-center gap-2 pt-0.5">
            <CardSignals rating={rating} />
            <CardCommerce price={price} />
          </div>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell to={to} className={className} index={index} layout="horizontal">
      <CardMedia image={image} alt={title} badge={badge} layout="horizontal" />
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <CardIdentity title={title} subtitle={subtitle} />
        <CardSignals rating={rating} eta={eta} distance={distance} />
      </div>
      <CardCommerce price={price} />
    </CardShell>
  );
}
