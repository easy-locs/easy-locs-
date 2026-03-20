import { useAuth } from "@/contexts/AuthContext";
import { useDriverLive } from "@/hooks/useDriverLive";

export default function DriverStatusQuickCard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useDriverLive(user?.id ?? null);

  if (!user?.id) return null;

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
      <p className="text-sm font-bold text-foreground">Driver Status</p>
      {isLoading ? (
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Online: {(profile as any)?.is_online ? "Yes" : "No"}
          </p>
          <p className="text-xs text-muted-foreground">
            Available: {(profile as any)?.is_available ? "Yes" : "No"}
          </p>
          <p className="text-xs text-muted-foreground">
            Current: {(profile as any)?.current_status || "unknown"}
          </p>
        </>
      )}
    </div>
  );
}
