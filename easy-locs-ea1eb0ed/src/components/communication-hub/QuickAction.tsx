export function QuickAction({ icon, label, color, onClick }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: `${color.replace(")", " / 0.1)")}`, color }}
      >
        {icon}
      </div>
      <span className="text-[0.625rem] font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
        {label}
      </span>
    </button>
  );
}
