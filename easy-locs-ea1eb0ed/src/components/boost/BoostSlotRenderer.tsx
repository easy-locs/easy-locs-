/**
 * BoostSlotRenderer — Drop-in smart banner component for any surface.
 * Passes full context: geo hierarchy, time, weather, taxonomy.
 * Zero tolerance: strict country → city → zone cascade.
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
  zone?: string | null;
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
  zone,
  className,
}: BoostSlotRendererProps) {
  const { getSlot, loading } = useBoostSlots(surface, {
    vertical,
    subcategory,
    country,
    city,
    zone,
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
