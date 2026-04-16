import { useState, useEffect, useMemo } from "react";
import { dldAnalyticsService } from "@/services/dld-analytics.service";
import type { DLDTransaction } from "@/domains/real-estate/canonical-types";
import { Scale, TrendingUp, TrendingDown } from "lucide-react";

const goldHex = "#EAB308";

function formatAED(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

interface ComparableSalesProps {
  district: string;
  propertyType?: string;
  bedrooms?: number;
  subjectPricePerSqft?: number;
}

export default function ComparableSales({
  district,
  propertyType,
  bedrooms,
  subjectPricePerSqft,
}: ComparableSalesProps) {
  const [comparables, setComparables] = useState<DLDTransaction[]>([]);
  const [medianPrice, setMedianPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bedroomFilter, setBedroomFilter] = useState<number | undefined>(bedrooms);

  useEffect(() => {
    setBedroomFilter(bedrooms);
  }, [bedrooms]);

  useEffect(() => {
    if (!district) return;
    setLoading(true);
    dldAnalyticsService.getComparableSales(district, propertyType, bedroomFilter, 20).then(result => {
      setComparables(result.comparables);
      setMedianPrice(result.medianPricePerSqft);
      setLoading(false);
    });
  }, [district, propertyType, bedroomFilter]);

  const benchmarkDiff = useMemo(() => {
    if (!subjectPricePerSqft || !medianPrice) return null;
    const pct = Math.round(((subjectPricePerSqft - medianPrice) / medianPrice) * 100);
    return pct;
  }, [subjectPricePerSqft, medianPrice]);

  if (!district) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Scale size={16} color={goldHex} />
        <h2 className="text-sm font-bold text-foreground">Comparable Sales</h2>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bedrooms:</span>
        {[undefined, 1, 2, 3, 4].map(br => (
          <button
            key={br ?? "all"}
            onClick={() => setBedroomFilter(br)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{
              background: bedroomFilter === br ? goldHex : "hsl(var(--muted))",
              color: bedroomFilter === br ? "hsl(226 24% 14%)" : "hsl(var(--muted-foreground))",
            }}
          >
            {br === undefined ? "All" : `${br} BR`}
          </button>
        ))}
      </div>

      {medianPrice > 0 && (
        <div
          className="p-3 rounded-xl mb-3 flex items-center justify-between"
          style={{ background: "hsl(var(--muted))" }}
        >
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Median Price/sqft</p>
            <p className="text-[16px] font-extrabold text-foreground">AED {medianPrice.toLocaleString()}</p>
          </div>
          {benchmarkDiff !== null && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">vs Subject</p>
              <span
                className="inline-flex items-center gap-0.5 text-[12px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: benchmarkDiff <= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: benchmarkDiff <= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {benchmarkDiff <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                {benchmarkDiff > 0 ? "+" : ""}{benchmarkDiff}%
              </span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
          ))}
        </div>
      ) : comparables.length > 0 ? (
        <div className="space-y-2">
          {comparables.map(tx => {
            const diff = medianPrice > 0
              ? Math.round(((tx.pricePerSqft - medianPrice) / medianPrice) * 100)
              : 0;
            return (
              <div
                key={tx.id}
                className="p-3 rounded-xl"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold text-foreground">
                    AED {formatAED(tx.amount)}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: diff <= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: diff <= 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {diff > 0 ? "+" : ""}{diff}% vs median
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{tx.areaSqft.toLocaleString()} sqft</span>
                  <span>·</span>
                  <span>AED {tx.pricePerSqft.toLocaleString()}/sqft</span>
                  {tx.bedrooms && <><span>·</span><span>{tx.bedrooms} BR</span></>}
                  <span>·</span>
                  <span className="capitalize">{tx.propertyType}</span>
                  <span className="ml-auto">{tx.transactionDate}</span>
                </div>
                {tx.buildingName && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{tx.buildingName}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center rounded-xl" style={{ background: "hsl(var(--muted))" }}>
          <Scale size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-[12px] text-muted-foreground">No comparable sales found for this filter</p>
        </div>
      )}
    </div>
  );
}
