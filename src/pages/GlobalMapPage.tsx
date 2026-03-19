/**
 * GlobalMapPage — Unified map for all geo-enabled services.
 * Route: /map or /super-map
 */
import { useNavigate } from "react-router-dom";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { ArrowLeft, Radar } from "lucide-react";
import RadarView from "@/components/radar/RadarView";

export default function GlobalMapPage() {
  const navigate = useNavigate();
  useDinoPageAudit({ actorType: "anonymous", pageKey: "global_map" });

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Nearby</h1>
          <p className="text-[10px] text-muted-foreground">Discover everything around you</p>
        </div>
        <button
          onClick={() => navigate("/radar")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
          style={{ background: "hsl(var(--primary) / 0.1)" }}
        >
          <Radar className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <RadarView showMap={true} />
      </div>
    </div>
  );
}
