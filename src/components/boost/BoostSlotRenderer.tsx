/**
 * BoostSlotRenderer — Drop-in component for any surface.
 * Just specify surface + slotKey and it auto-resolves & renders.
 */
import { useBoostSlots } from "@/hooks/useBoostEngine";
import { CanonicalBoostBanner } from "./CanonicalBoostBanner";

interface BoostSlotRendererProps {
  surface: string;
  slotKey: string;
  variant?: "inline" | "hero" | "card" | "micro";
  vertical?: string | null;
  subcategory?: string | null;
  country?: string | null;
  city?: string | null;
  className?: string;
}

export function BoostSlotRenderer({
  surface,
  slotKey,
  variant = "inline",
  vertical,
  subcategory,
  country,
  city,
  className,
}: BoostSlotRendererProps) {
  const { getSlot, loading } = useBoostSlots(surface, {
    vertical,
    subcategory,
    country,
    city,
  });

  if (loading) return null;

  const match = getSlot(slotKey);
  if (!match) return null;

  return (
    <CanonicalBoostBanner
      match={match}
      variant={variant}
      className={className}
    />
  );
}
