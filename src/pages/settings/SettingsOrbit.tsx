/**
 * SettingsOrbit — Standalone Orbit settings page
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import OrbitSessionManager from "@/components/orbit/OrbitSessionManager";

export default function SettingsOrbit() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">Orbit</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2">
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          {user && <OrbitSessionManager userId={user.id} />}
        </div>
      </div>
    </div>
  );
}
