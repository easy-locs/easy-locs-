export type SimpleNavTab =
  | "overview"
  | "chat"
  | "owner"
  | "tenant"
  | "search"
  | "payments"
  | "merchant"
  | "system";

export function SimpleNavTabs(props: {
  value: SimpleNavTab;
  onChange: (tab: SimpleNavTab) => void;
}) {
  const tabs: SimpleNavTab[] = [
    "overview",
    "chat",
    "owner",
    "tenant",
    "search",
    "payments",
    "merchant",
    "system",
  ];

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            props.value === tab
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
          onClick={() => props.onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
