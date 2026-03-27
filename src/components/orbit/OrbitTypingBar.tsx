type Props = {
  names: string[];
};

export function OrbitTypingBar({ names }: Props) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : `${names.slice(0, 2).join(", ")} are typing...`;

  return (
    <div className="px-3 py-1.5 shrink-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </span>
        {label}
      </div>
    </div>
  );
}
