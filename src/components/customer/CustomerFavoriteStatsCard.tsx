import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerFavoriteStatsCard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-favorite-stats-card", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user!.id)
        .limit(500);
      if (error) throw error;
      return { total: (data ?? []).length };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  if (!user?.id) return null;

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-sm font-bold text-foreground">Favorites</p>
      {isLoading ? (
        <div className="h-6 w-16 rounded bg-muted animate-pulse mt-2" />
      ) : (
        <>
          <p className="text-2xl font-bold text-foreground mt-1">{Number(data?.total ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Saved merchants in your account</p>
        </>
      )}
    </div>
  );
}
