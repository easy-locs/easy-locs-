import type { DLDTransaction, DLDDistrictSummary, DLDMarketKPI, DLDMonthlyTrend } from "@/domains/real-estate/canonical-types";

function matchesPeriod(dateStr: string, period: string): boolean {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    const month = parseInt(dateStr.slice(5, 7));
    const txYear = dateStr.slice(0, 4);
    if (txYear !== year) return false;
    if (qNum === 1) return month >= 1 && month <= 3;
    if (qNum === 2) return month >= 4 && month <= 6;
    if (qNum === 3) return month >= 7 && month <= 9;
    return month >= 10 && month <= 12;
  }
  return dateStr.startsWith(period);
}

function getPreviousPeriod(period: string): string {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    if (qNum === 1) return `${parseInt(year) - 1}-Q4`;
    return `${year}-Q${qNum - 1}`;
  }
  if (period.length === 4) {
    return `${parseInt(period) - 1}`;
  }
  const [yr, mo] = period.split("-").map(Number);
  if (mo === 1) return `${yr - 1}-12`;
  return `${yr}-${String(mo - 1).padStart(2, "0")}`;
}

const DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: "Dubai Marina", lat: 25.0804, lng: 55.1403 },
  { name: "Downtown Dubai", lat: 25.1972, lng: 55.2744 },
  { name: "Business Bay", lat: 25.1860, lng: 55.2621 },
  { name: "Palm Jumeirah", lat: 25.1124, lng: 55.1390 },
  { name: "JVC", lat: 25.0555, lng: 55.2107 },
  { name: "JLT", lat: 25.0763, lng: 55.1464 },
  { name: "Dubai Hills", lat: 25.1063, lng: 55.2388 },
  { name: "Arabian Ranches", lat: 25.0609, lng: 55.2707 },
  { name: "DIFC", lat: 25.2102, lng: 55.2797 },
  { name: "Jumeirah Beach Residence", lat: 25.0783, lng: 55.1336 },
  { name: "Dubai Creek Harbour", lat: 25.2050, lng: 55.3450 },
  { name: "MBR City", lat: 25.1700, lng: 55.3100 },
  { name: "Damac Hills", lat: 25.0190, lng: 55.2470 },
  { name: "Al Barsha", lat: 25.1090, lng: 55.2000 },
  { name: "International City", lat: 25.1567, lng: 55.4067 },
];

const PROPERTY_TYPES: ("apartment" | "villa" | "townhouse" | "penthouse" | "office" | "land")[] = [
  "apartment", "villa", "townhouse", "penthouse", "office", "land",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateTransactions(): DLDTransaction[] {
  const rng = seededRandom(42);
  const transactions: DLDTransaction[] = [];
  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];

  let id = 1;
  for (const month of months) {
    for (const district of DISTRICTS) {
      const txCount = Math.floor(rng() * 40) + 10;
      for (let i = 0; i < txCount; i++) {
        const propType = PROPERTY_TYPES[Math.floor(rng() * PROPERTY_TYPES.length)];
        const day = Math.floor(rng() * 28) + 1;
        const dayStr = day < 10 ? `0${day}` : `${day}`;

        let basePriceSqft: number;
        switch (district.name) {
          case "Palm Jumeirah": basePriceSqft = 2500 + rng() * 1500; break;
          case "Downtown Dubai": basePriceSqft = 2200 + rng() * 1200; break;
          case "DIFC": basePriceSqft = 2000 + rng() * 1000; break;
          case "Dubai Marina": basePriceSqft = 1600 + rng() * 800; break;
          case "Dubai Hills": basePriceSqft = 1400 + rng() * 600; break;
          case "Business Bay": basePriceSqft = 1500 + rng() * 700; break;
          case "JBR": case "Jumeirah Beach Residence": basePriceSqft = 1800 + rng() * 900; break;
          case "Dubai Creek Harbour": basePriceSqft = 1700 + rng() * 800; break;
          case "MBR City": basePriceSqft = 1300 + rng() * 500; break;
          case "JVC": basePriceSqft = 900 + rng() * 400; break;
          case "JLT": basePriceSqft = 1000 + rng() * 500; break;
          case "International City": basePriceSqft = 600 + rng() * 300; break;
          default: basePriceSqft = 1100 + rng() * 500; break;
        }

        let areaSqft: number;
        switch (propType) {
          case "villa": areaSqft = 3000 + Math.floor(rng() * 5000); break;
          case "townhouse": areaSqft = 1500 + Math.floor(rng() * 2000); break;
          case "penthouse": areaSqft = 2500 + Math.floor(rng() * 4000); break;
          case "office": areaSqft = 800 + Math.floor(rng() * 3000); break;
          case "land": areaSqft = 5000 + Math.floor(rng() * 15000); break;
          default: areaSqft = 500 + Math.floor(rng() * 1500); break;
        }

        const pricePerSqft = Math.round(basePriceSqft);
        const amount = Math.round(pricePerSqft * areaSqft);

        const bedrooms = propType === "apartment" ? Math.floor(rng() * 4) + 1
          : propType === "villa" ? Math.floor(rng() * 4) + 3
          : propType === "townhouse" ? Math.floor(rng() * 3) + 2
          : propType === "penthouse" ? Math.floor(rng() * 3) + 3
          : undefined;

        transactions.push({
          id: `dld-tx-${id++}`,
          transactionDate: `${month}-${dayStr}`,
          district: district.name,
          area: district.name,
          propertyType: propType,
          transactionType: rng() < 0.85 ? "sale" : rng() < 0.5 ? "mortgage" : "gift",
          amount,
          currency: "AED",
          areaSqft,
          pricePerSqft,
          buildingName: propType !== "land" ? `${district.name} Tower ${Math.floor(rng() * 20) + 1}` : undefined,
          bedrooms,
          isFreehold: rng() < 0.8,
          buyerNationality: ["IN", "GB", "RU", "PK", "AE", "CN", "EG", "FR", "US", "DE"][Math.floor(rng() * 10)],
          createdAt: `${month}-${dayStr}T12:00:00Z`,
        });
      }
    }
  }
  return transactions;
}

export const FALLBACK_DLD_TRANSACTIONS = generateTransactions();

export function computeDistrictSummaries(
  transactions: DLDTransaction[],
  currentPeriod?: string
): DLDDistrictSummary[] {
  const period = currentPeriod || "2026-04";
  const prevPeriod = getPreviousPeriod(period);

  const currentTx = transactions.filter(t => matchesPeriod(t.transactionDate, period));
  const prevTx = transactions.filter(t => matchesPeriod(t.transactionDate, prevPeriod));

  const byDistrict = new Map<string, DLDTransaction[]>();
  for (const tx of currentTx) {
    const arr = byDistrict.get(tx.district) || [];
    arr.push(tx);
    byDistrict.set(tx.district, arr);
  }

  const prevByDistrict = new Map<string, DLDTransaction[]>();
  for (const tx of prevTx) {
    const arr = prevByDistrict.get(tx.district) || [];
    arr.push(tx);
    prevByDistrict.set(tx.district, arr);
  }

  return DISTRICTS.map(d => {
    const txs = byDistrict.get(d.name) || [];
    const prevTxs = prevByDistrict.get(d.name) || [];
    const totalAmount = txs.reduce((sum, t) => sum + t.amount, 0);
    const avgPrice = txs.length > 0 ? Math.round(txs.reduce((sum, t) => sum + t.pricePerSqft, 0) / txs.length) : 0;
    const prevAvg = prevTxs.length > 0 ? Math.round(prevTxs.reduce((sum, t) => sum + t.pricePerSqft, 0) / prevTxs.length) : avgPrice;
    const changePercent = prevAvg > 0 ? Math.round(((avgPrice - prevAvg) / prevAvg) * 1000) / 10 : 0;

    const typeCount = new Map<string, number>();
    for (const tx of txs) {
      typeCount.set(tx.propertyType, (typeCount.get(tx.propertyType) || 0) + 1);
    }
    let dominantType: DLDTransaction["propertyType"] = "apartment";
    let maxCount = 0;
    for (const [type, count] of typeCount) {
      if (count > maxCount) { maxCount = count; dominantType = type as DLDTransaction["propertyType"]; }
    }

    return {
      district: d.name,
      transactionCount: txs.length,
      totalAmount,
      avgPricePerSqft: avgPrice,
      dominantType,
      changePercent,
      lat: d.lat,
      lng: d.lng,
    };
  }).sort((a, b) => b.transactionCount - a.transactionCount);
}

export function computeMarketKPIs(transactions: DLDTransaction[], period?: string): DLDMarketKPI {
  const currentPeriod = period || "2026-04";
  const prevPeriod = getPreviousPeriod(currentPeriod);

  const currentTx = transactions.filter(t => matchesPeriod(t.transactionDate, currentPeriod));
  const prevTx = transactions.filter(t => matchesPeriod(t.transactionDate, prevPeriod));

  const totalVolume = currentTx.reduce((sum, t) => sum + t.amount, 0);
  const avgPrice = currentTx.length > 0 ? Math.round(currentTx.reduce((sum, t) => sum + t.pricePerSqft, 0) / currentTx.length) : 0;
  const prevAvg = prevTx.length > 0 ? Math.round(prevTx.reduce((sum, t) => sum + t.pricePerSqft, 0) / prevTx.length) : avgPrice;
  const changeVsPrevious = prevAvg > 0 ? Math.round(((avgPrice - prevAvg) / prevAvg) * 1000) / 10 : 0;

  return {
    totalTransactions: currentTx.length,
    totalVolume,
    avgPricePerSqft: avgPrice,
    changeVsPrevious,
    period: currentPeriod,
  };
}

export function computeMonthlyTrends(transactions: DLDTransaction[], districts?: string[]): DLDMonthlyTrend[] {
  const months = [...new Set(transactions.map(t => t.transactionDate.slice(0, 7)))].sort();
  const filtered = districts && districts.length > 0
    ? transactions.filter(t => districts.includes(t.district))
    : transactions;

  const trends: DLDMonthlyTrend[] = [];

  for (const month of months) {
    const monthTx = filtered.filter(t => t.transactionDate.startsWith(month));

    if (!districts || districts.length === 0) {
      const avgPrice = monthTx.length > 0 ? Math.round(monthTx.reduce((s, t) => s + t.pricePerSqft, 0) / monthTx.length) : 0;
      trends.push({
        month,
        district: "All Dubai",
        avgPricePerSqft: avgPrice,
        transactionCount: monthTx.length,
        totalVolume: monthTx.reduce((s, t) => s + t.amount, 0),
      });
    } else {
      for (const district of districts) {
        const districtTx = monthTx.filter(t => t.district === district);
        const avgPrice = districtTx.length > 0 ? Math.round(districtTx.reduce((s, t) => s + t.pricePerSqft, 0) / districtTx.length) : 0;
        trends.push({
          month,
          district,
          avgPricePerSqft: avgPrice,
          transactionCount: districtTx.length,
          totalVolume: districtTx.reduce((s, t) => s + t.amount, 0),
        });
      }
    }
  }

  return trends;
}
