import { useDriverStore } from "@/stores/driverStore";
import { Power, MapPin } from "lucide-react";

export function DriverPanel() {
  const online = useDriverStore((s) => s.online);
  const setOnline = useDriverStore((s) => s.setOnline);
  const updatePosition = useDriverStore((s) => s.updatePosition);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-card border border-border">
      <h3 className="text-sm font-semibold text-foreground">Driver Mode</h3>

      <div className="flex gap-2">
        <button
          onClick={() => void setOnline(!online)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-[0.97] ${
            online
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          <Power className="w-4 h-4" />
          {online ? "Go Offline" : "Go Online"}
        </button>

        <button
          onClick={() => void updatePosition()}
          className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors active:scale-[0.97]"
        >
          <MapPin className="w-4 h-4" />
          Update Pos
        </button>
      </div>
    </div>
  );
}
