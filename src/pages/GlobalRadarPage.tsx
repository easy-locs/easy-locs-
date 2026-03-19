/**
 * GlobalRadarPage — Radar discovery for all nearby entities.
 * Route: /radar
 */
import { useNavigate } from "react-router-dom";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { ArrowLeft, Map } from "lucide-react";
import RadarView from "@/components/radar/RadarView";

export default function GlobalRadarPage() {
  const navigate = useNavigate();
  useDinoPageAudit({ actorType: "anonymous", pageKey: "global_radar" });

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
          <h1 className="text-lg font-bold">Radar</h1>
          <p className="text-[10px] text-muted-foreground">Scan nearby services</p>
        </div>
        <button
          onClick={() => navigate("/super-map")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
          style={{ background: "hsl(var(--primary) / 0.1)" }}
        >
          <Map className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <RadarView showMap={false} />
      </div>
    </div>
  );
}
