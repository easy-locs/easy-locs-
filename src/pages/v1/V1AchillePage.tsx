import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getV1AchilleMerchants } from "@/lib/v1/v1AchilleCore";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";

function AchilleBody() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v1-achille-merchants"],
    queryFn: () => getV1AchilleMerchants({ limit: 40 }),
    staleTime: 10_000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Achille Marketplace</h1>

      {isLoading && [1, 2, 3].map((i) => <div key={i} className="rounded-[28px] bg-muted/40 h-32 animate-pulse" />)}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <div className="text-sm text-muted-foreground">No merchants found</div>
        </div>
      )}

      {!isLoading &&
        rows.map((row: any) => (
          <button
            key={row.id}
            onClick={() => navigate(`/food/restaurant/${row.id}`)}
            className="w-full rounded-[24px] border border-border/20 bg-card overflow-hidden text-left active:scale-[0.99] transition-transform"
          >
            {row.cover_image ? (
              <img src={row.cover_image} alt={row.name} className="w-full h-36 object-cover" />
            ) : null}
            <div className="p-4">
              <div className="text-sm font-bold">{row.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {row.subcategory || row.category} · {row.area || row.city || "Dubai"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ⭐ {Number(row.rating ?? 4.2).toFixed(1)} · {row.delivery_time_min ?? 20}–{row.delivery_time_max ?? 35} min
              </div>
            </div>
          </button>
        ))}
    </div>
  );
}

export default function V1AchillePage() {
  return (
    <V1PrimaryAppBridge module="achille">
      {() => <AchilleBody />}
    </V1PrimaryAppBridge>
  );
}
