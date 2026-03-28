/**
 * CardLocation — Location display block for cards.
 */
import { MapPin } from "lucide-react";

interface CardLocationProps {
  address?: string;
  city?: string;
  country?: string;
}

export function CardLocation({ address, city, country }: CardLocationProps) {
  const label = [address, city, country].filter(Boolean).join(", ");
  if (!label) return null;

  return (
    <div className="flex items-center gap-1 min-w-0">
      <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
      <span className="text-2xs text-muted-foreground break-words leading-snug line-clamp-2">{label}</span>
    </div>
  );
}
