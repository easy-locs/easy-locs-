import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listRecentSearches } from "@/lib/search/searchHistory";

export default function AdminSearchWatchPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-search-watch"],
    queryFn: async () => listRecentSearches(null, 50),
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Search Watch</h1>
          <p className="text-xs text-muted-foreground">Recent search behavior snapshot</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground pt-8">No recent searches</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any, idx: number) => (
            <div key={idx} className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
              <p className="text-sm font-semibold text-foreground">{row.queryText}</p>
              <p className="text-[11px] text-muted-foreground/70">
                {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
