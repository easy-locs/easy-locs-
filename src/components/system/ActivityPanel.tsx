import { useActivityLogStore } from "@/stores/activityLogStore";

export function ActivityPanel() {
  const items = useActivityLogStore((s) => s.items);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Activity</h3>
      <div className="space-y-1 max-h-64 overflow-auto">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-2">
              <p className="text-sm font-medium text-foreground">{item.action}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.entity_type ?? "-"} / {item.entity_id ?? "-"}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.created_at}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
