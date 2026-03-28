import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";

type Props = {
  items: any[];
  loading?: boolean;
};

export function OrbitCallHistoryPanel({ items, loading }: Props) {
  if (loading) {
    return <p className="p-4 text-xs text-muted-foreground">Loading call history...</p>;
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Call history</p>

      <div className="flex flex-col gap-1">
        {items.map((item: any) => {
          const isMissed = item.missed || item.status === "missed";
          const isIncoming = item.direction === "incoming";
          const Icon = isMissed ? PhoneMissed : isIncoming ? PhoneIncoming : PhoneOutgoing;

          return (
            <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
              <Icon className={`w-4 h-4 shrink-0 ${isMissed ? "text-destructive" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium capitalize">{item.call_type} call</p>
                <p className="text-[11px] text-muted-foreground break-words leading-snug">
                  {item.direction} · {item.status}
                  {isMissed ? " · missed" : ""}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
              </span>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No calls yet</p>
        )}
      </div>
    </div>
  );
}
