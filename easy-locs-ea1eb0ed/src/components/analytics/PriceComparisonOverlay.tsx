import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scale, TrendingUp, TrendingDown, Plus, Minus, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dldAnalyticsService } from "@/services/dld-analytics.service";

interface Building {
  name: string;
  district: string;
  avgPricePerSqft: number;
  transactionCount: number;
  totalVolume: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  subjectBuilding?: string;
  subjectDistrict?: string;
  subjectPrice?: number;
}

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

export default function PriceComparisonOverlay({
  visible,
  onClose,
  subjectBuilding,
  subjectDistrict,
  subjectPrice,
}: Props) {
  const [compareList, setCompareList] = useState<string[]>([]);

  const { data: buildings, isLoading } = useQuery({
    queryKey: ["compare-buildings", subjectDistrict],
    queryFn: async () => {
      const result = await dldAnalyticsService.getDistrictBuildings(subjectDistrict || "");
      return (result?.data?.buildings || []) as Building[];
    },
    enabled: visible && !!subjectDistrict,
    staleTime: 10 * 60 * 1000,
  });

  const available = useMemo(() =>
    (buildings || []).filter(b => b.name !== subjectBuilding),
    [buildings, subjectBuilding]
  );

  const compared = useMemo(() =>
    available.filter(b => compareList.includes(b.name)),
    [available, compareList]
  );

  const toggleBuilding = (name: string) => {
    setCompareList(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name].slice(0, 5)
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-accent" />
              <h2 className="text-base font-bold text-foreground">Price Comparison</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/20 flex items-center justify-center">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {subjectBuilding && subjectPrice && (
              <div className="rounded-2xl p-4 bg-accent/8 border border-accent/20">
                <p className="text-[0.625rem] text-muted-foreground uppercase tracking-wider mb-1">Subject Property</p>
                <p className="text-sm font-bold text-foreground">{subjectBuilding}</p>
                <p className="text-xs text-muted-foreground">{subjectDistrict}</p>
                <p className="text-lg font-extrabold text-accent mt-1">AED {subjectPrice.toLocaleString()}/sqft</p>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/20" />
                ))}
              </div>
            ) : available.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Buildings in {subjectDistrict} ({available.length})
                </p>
                <div className="space-y-2">
                  {available.map(b => {
                    const selected = compareList.includes(b.name);
                    const diff = subjectPrice
                      ? Math.round(((b.avgPricePerSqft - subjectPrice) / subjectPrice) * 100)
                      : null;
                    return (
                      <button
                        key={b.name}
                        onClick={() => toggleBuilding(b.name)}
                        className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all ${
                          selected ? "bg-accent/8 border border-accent/20" : "bg-card border border-border"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/20">
                          {selected ? <Minus className="h-4 w-4 text-accent" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                          <p className="text-[0.625rem] text-muted-foreground">
                            AED {b.avgPricePerSqft.toLocaleString()}/sqft · {b.transactionCount} txn
                          </p>
                        </div>
                        {diff !== null && (
                          <span className={`text-xs font-bold ${diff <= 0 ? "text-success" : "text-destructive"}`}>
                            {diff > 0 ? "+" : ""}{diff}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No comparable buildings found</p>
              </div>
            )}

            {compared.length > 0 && (
              <div className="rounded-2xl p-4 bg-card border border-border space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Comparison Summary ({compared.length} buildings)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {compared.map(b => {
                    const diff = subjectPrice
                      ? Math.round(((b.avgPricePerSqft - subjectPrice) / subjectPrice) * 100)
                      : null;
                    return (
                      <div key={b.name} className="rounded-xl p-2.5 bg-muted/10">
                        <p className="text-xs font-semibold text-foreground truncate">{b.name}</p>
                        <p className="text-base font-bold text-foreground">AED {b.avgPricePerSqft.toLocaleString()}</p>
                        {diff !== null && (
                          <span className={`text-[0.625rem] font-bold flex items-center gap-0.5 ${diff <= 0 ? "text-success" : "text-destructive"}`}>
                            {diff <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                            {diff > 0 ? "+" : ""}{diff}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
