/**
 * CardCommerce — Price display block for cards.
 */

interface CardCommerceProps {
  price?: string;
  currency?: string;
}

export function CardCommerce({ price, currency }: CardCommerceProps) {
  if (!price) return null;

  return (
    <div className="flex items-center shrink-0">
      <span className="text-xs font-bold text-foreground">
        {price}{currency ? ` ${currency}` : ""}
      </span>
    </div>
  );
}
