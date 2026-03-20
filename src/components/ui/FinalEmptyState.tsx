type FinalEmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function FinalEmptyState({
  icon = "✨",
  title,
  description,
  actionLabel,
  onAction,
}: FinalEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground mt-2 max-w-[240px]">{description}</p>
      ) : null}

      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-4 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
