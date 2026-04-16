import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { dldAnalyticsService } from "@/services/dld-analytics.service";
import type { DLDTransaction } from "@/domains/real-estate/canonical-types";
import { Search, Building2, ChevronDown, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const navy = "hsl(226 24% 14%)";
const goldHex = "#EAB308";

function formatAED(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

interface BuildingPriceHistoryProps {
  preselectedBuilding?: string;
  preselectedDistrict?: string;
  onBuildingSelect?: (building: string, district: string, avgPricePerSqft?: number, dominantType?: string, dominantBedrooms?: number) => void;
  onBuildingClear?: () => void;
}

export default function BuildingPriceHistory({
  preselectedBuilding,
  preselectedDistrict,
  onBuildingSelect,
  onBuildingClear,
}: BuildingPriceHistoryProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>(preselectedBuilding || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [transactions, setTransactions] = useState<DLDTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const buildingRequestVersion = useRef(0);
  const buildingListVersion = useRef(0);

  const [allBuildings, setAllBuildings] = useState<string[]>(() => {
    if (preselectedDistrict) {
      return dldAnalyticsService.getBuildingsForDistrict(preselectedDistrict);
    }
    return [];
  });

  useEffect(() => {
    const version = ++buildingListVersion.current;
    if (preselectedDistrict) {
      setAllBuildings(dldAnalyticsService.getBuildingsForDistrict(preselectedDistrict));
    } else {
      dldAnalyticsService.getAllBuildings().then(buildings => {
        if (buildingListVersion.current !== version) return;
        setAllBuildings(buildings);
      });
    }

    dldAnalyticsService.getBuildingsLive(preselectedDistrict).then(live => {
      if (buildingListVersion.current !== version) return;
      if (live && live.length > 0) {
        setAllBuildings(live.map(b => b.name));
      }
    });
  }, [preselectedDistrict]);

  const filteredBuildings = useMemo(() => {
    if (!searchQuery) return allBuildings.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return allBuildings.filter(b => b.toLowerCase().includes(q)).slice(0, 20);
  }, [allBuildings, searchQuery]);

  useEffect(() => {
    if (preselectedBuilding && preselectedBuilding !== selectedBuilding) {
      setSelectedBuilding(preselectedBuilding);
    } else if (!preselectedBuilding && selectedBuilding) {
      setSelectedBuilding("");
      setTransactions([]);
      setLoading(false);
    }
  }, [preselectedBuilding]);

  useEffect(() => {
    const version = ++buildingRequestVersion.current;
    if (!selectedBuilding) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    dldAnalyticsService.getBuildingHistory(selectedBuilding).then(result => {
      if (buildingRequestVersion.current !== version) return;
      const txs = result.data;
      setTransactions(txs);
      setLoading(false);
      if (txs.length > 0 && onBuildingSelect) {
        const avgPrice = Math.round(txs.reduce((s, t) => s + t.pricePerSqft, 0) / txs.length);
        const typeCount = new Map<string, number>();
        const brCount = new Map<number, number>();
        for (const t of txs) {
          typeCount.set(t.propertyType, (typeCount.get(t.propertyType) || 0) + 1);
          if (t.bedrooms !== undefined) {
            brCount.set(t.bedrooms, (brCount.get(t.bedrooms) || 0) + 1);
          }
        }
        let dominantType = txs[0].propertyType;
        let maxTypeCount = 0;
        for (const [type, count] of typeCount) {
          if (count > maxTypeCount) { maxTypeCount = count; dominantType = type; }
        }
        let dominantBedrooms: number | undefined;
        let maxBrCount = 0;
        for (const [br, count] of brCount) {
          if (count > maxBrCount) { maxBrCount = count; dominantBedrooms = br; }
        }
        onBuildingSelect(selectedBuilding, txs[0].district, avgPrice, dominantType, dominantBedrooms);
      }
    });
  }, [selectedBuilding]);

  const handleSelect = useCallback((building: string) => {
    setSelectedBuilding(building);
    setShowDropdown(false);
    setSearchQuery("");
  }, []);

  const chartData = useMemo(() => {
    const monthMap = new Map<string, { prices: number[]; count: number }>();
    for (const tx of transactions) {
      const month = tx.transactionDate.slice(0, 7);
      const entry = monthMap.get(month) || { prices: [], count: 0 };
      entry.prices.push(tx.pricePerSqft);
      entry.count++;
      monthMap.set(month, entry);
    }
    return [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month: month.slice(2),
        avgPrice: Math.round(data.prices.reduce((s, p) => s + p, 0) / data.prices.length),
        txCount: data.count,
      }));
  }, [transactions]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} color={goldHex} />
        <h2 className="text-sm font-bold text-foreground">Building Price History</h2>
      </div>

      <div className="relative mb-3">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Search size={14} className="text-muted-foreground" />
          {selectedBuilding ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[0.75rem] font-medium text-foreground">{selectedBuilding}</span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedBuilding("");
                  setTransactions([]);
                  onBuildingClear?.();
                }}
                className="ml-auto"
              >
                <X size={12} className="text-muted-foreground" />
              </button>
            </div>
          ) : (
            <span className="text-[0.75rem] text-muted-foreground flex-1">Search buildings...</span>
          )}
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>

        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border shadow-lg max-h-60 overflow-y-auto"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
          >
            <div className="p-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type building name..."
                className="w-full text-[0.75rem] px-3 py-2 rounded-lg border"
                style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                autoFocus
              />
            </div>
            {filteredBuildings.map(b => (
              <button
                key={b}
                onClick={() => handleSelect(b)}
                className="w-full text-left px-3 py-2 text-[0.75rem] hover:bg-muted/50 transition-colors"
                style={{ color: "hsl(var(--foreground))" }}
              >
                {b}
              </button>
            ))}
            {filteredBuildings.length === 0 && (
              <p className="px-3 py-2 text-[0.6875rem] text-muted-foreground">No buildings found</p>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
          ))}
        </div>
      )}

      {!loading && selectedBuilding && transactions.length > 0 && (
        <>
          {chartData.length > 1 && (
            <div className="rounded-xl p-3 mb-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}>
              <p className="text-[0.625rem] text-muted-foreground uppercase tracking-wider mb-2">Price/sqft Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#888" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#888" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: navy,
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.625rem",
                    }}
                    formatter={(value: number) => [`AED ${value.toLocaleString()}/sqft`, "Avg Price"]}
                  />
                  <Line type="monotone" dataKey="avgPrice" stroke={goldHex} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border) / 0.5)" }}>
            <div className="px-3 py-2" style={{ background: "hsl(var(--muted))" }}>
              <p className="text-[0.625rem] text-muted-foreground uppercase tracking-wider font-medium">
                {transactions.length} transactions found
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
              {transactions.map(tx => (
                <div key={tx.id} className="px-3 py-2.5 flex items-center gap-3" style={{ background: "hsl(var(--card))" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.75rem] font-bold text-foreground">
                        AED {formatAED(tx.amount)}
                      </span>
                      <span className="text-[0.625rem] capitalize text-muted-foreground">{tx.propertyType}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[0.625rem] text-muted-foreground">
                      <span>{tx.areaSqft.toLocaleString()} sqft</span>
                      <span>·</span>
                      <span>AED {tx.pricePerSqft.toLocaleString()}/sqft</span>
                      {tx.bedrooms && <><span>·</span><span>{tx.bedrooms} BR</span></>}
                    </div>
                  </div>
                  <span className="text-[0.625rem] text-muted-foreground shrink-0">{tx.transactionDate}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && selectedBuilding && transactions.length === 0 && (
        <div className="p-6 text-center rounded-xl" style={{ background: "hsl(var(--muted))" }}>
          <Building2 size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-[0.75rem] text-muted-foreground">No transactions found for this building</p>
        </div>
      )}

      {!selectedBuilding && (
        <div className="p-6 text-center rounded-xl" style={{ background: "hsl(var(--muted))" }}>
          <Search size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-[0.75rem] text-muted-foreground">Search for a building to see its sale history</p>
        </div>
      )}
    </div>
  );
}
