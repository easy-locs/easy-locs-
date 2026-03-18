/**
 * RidePriorityPicker — UI picker for rider priority tier.
 */
export default function RidePriorityPicker({
  value,
  onChange,
}: {
  value: "standard" | "priority" | "vip";
  onChange: (v: "standard" | "priority" | "vip") => void;
}) {
  const options: Array<{ key: "standard" | "priority" | "vip"; label: string }> = [
    { key: "standard", label: "Standard" },
    { key: "priority", label: "Priority" },
    { key: "vip", label: "VIP" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            value === opt.key
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-card text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
