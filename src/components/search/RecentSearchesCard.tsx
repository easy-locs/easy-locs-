import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { listRecentSearches } from "@/lib/search/searchHistory";

export default function RecentSearchesCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["recent-searches-card", user?.id],
    queryFn: () => listRecentSearches(user?.id ?? null, 8),
    staleTime: 5000,
  });

  if (!isLoading && rows.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-bold text-foreground mb-2">Recent Searches</p>

      {isLoading &&
        [1, 2].map((i) => (
          <div key={i} className="h-8 rounded-full bg-muted animate-pulse w-24 inline-block mr-2" />
        ))}

      {!isLoading && rows.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {rows.map((row, idx) => (
            <button
              key={idx}
              onClick={() => navigate(`/search-results?q=${encodeURIComponent(row.queryText)}`)}
              className="shrink-0 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground active:scale-95 transition-transform"
            >
              {row.queryText}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
