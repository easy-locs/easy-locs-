import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { runUnifiedSearch } from "@/lib/search/searchEngine";
import { ArrowLeft } from "lucide-react";

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [localQuery, setLocalQuery] = useState(params.get("q") || "");

  const q = params.get("q") || "";

  const { data, isLoading } = useQuery({
    queryKey: ["unified-search", q],
    queryFn: () => runUnifiedSearch(q),
    enabled: !!q.trim(),
    staleTime: 5000,
  });

  const merchants = useMemo(() => data?.merchants ?? [], [data]);
  const products = useMemo(() => data?.products ?? [], [data]);

  const submit = () => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("q", localQuery);
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex gap-2">
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search..."
            className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
          />
          <button
            onClick={submit}
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold"
          >
            Go
          </button>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/30 h-16 animate-pulse" />
      ))}

      {!isLoading && q && (
        <>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Merchants
          </p>

          {merchants.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No merchants found
            </p>
          )}

          {merchants.map((row: any) => (
            <button
              key={row.id}
              onClick={() => navigate(`/food/restaurant/${row.id}`)}
              className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform"
            >
              <p className="text-sm font-bold text-foreground">{row.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {row.subcategory || row.category} · {row.area || row.city || "Dubai"}
              </p>
            </button>
          ))}

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">
            Products
          </p>

          {products.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No products found
            </p>
          )}

          {products.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">{row.name}</p>
              <p className="text-[11px] text-muted-foreground">{row.category || "Product"}</p>
              <p className="text-xs font-bold text-primary">{Number(row.price ?? 0).toFixed(2)} AED</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
