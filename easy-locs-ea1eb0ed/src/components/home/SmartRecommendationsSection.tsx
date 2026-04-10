import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getSmartRecommendations } from "@/lib/recommendation/smartRecommendations";

export default function SmartRecommendationsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["smart-home-recommendations", user?.id],
    queryFn: () => getSmartRecommendations({ userId: user?.id ?? null, limit: 10 }),
    staleTime: 10000,
  });

  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-bold text-foreground mb-3">Recommended For You</p>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((row: any) => (
            <button
              key={row.id}
              onClick={() => navigate(`/s/${row.id}`)}
              className="rounded-2xl overflow-hidden border border-border/20 bg-card text-left active:scale-[0.98] transition-transform"
            >
              <div className="h-24 bg-muted">
                {row.cover_image ? (
                  <img
                    src={row.cover_image}
                    alt={row.name}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>

              <div className="p-3">
                <p className="text-sm font-bold text-foreground truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.subcategory || row.category} · {row.area || row.city || "Dubai"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⭐ {Number(row.rating ?? 4.2).toFixed(1)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
