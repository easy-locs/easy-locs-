/**
 * MapTabPage — Map tab entry point.
 * Full-screen map with bottom sheet for Ride / Send / Nearby.
 */
import { useNavigate } from "react-router-dom";
import { Car, Package, MapPin } from "lucide-react";

const ACTIONS = [
  { key: "ride", label: "Ride", icon: Car, path: "/ride", desc: "Book a ride" },
  { key: "send", label: "Send", icon: Package, path: "/send", desc: "Send a package" },
  { key: "nearby", label: "Nearby", icon: MapPin, path: "/explore", desc: "Discover nearby" },
];

export default function MapTabPage() {
  const navigate = useNavigate();

  return (
    <div className="relative h-[100dvh] flex flex-col" style={{ background: "hsl(var(--muted))" }}>
      {/* Map placeholder — will be replaced with Mapbox */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="w-12 h-12 mx-auto" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
            Map loading...
          </p>
        </div>
      </div>

      {/* Bottom sheet */}
      <div
        className="absolute bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 rounded-t-[20px] px-5 pt-5 pb-4"
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 -4px 30px hsl(var(--background) / 0.5)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "hsl(var(--border))" }} />
        <h2 className="text-base font-bold mb-3" style={{ color: "hsl(var(--foreground))" }}>
          Where to?
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-150 active:scale-95"
                style={{ background: "hsl(var(--muted))" }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: "hsl(var(--accent) / 0.12)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
