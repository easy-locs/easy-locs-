/**
 * CardIdentity — Title + subtitle block for any card.
 * Enforces anti-truncation: line-clamp-2 + break-words.
 */

interface CardIdentityProps {
  title: string;
  subtitle?: string;
}

export function CardIdentity({ title, subtitle }: CardIdentityProps) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words leading-snug">{title}</h3>
      {subtitle && (
        <p className="text-2xs text-muted-foreground line-clamp-2 break-words leading-snug">{subtitle}</p>
      )}
    </div>
  );
}
