import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingUp, Calculator, DollarSign, BarChart3 } from "lucide-react";
import type { Property } from "@/domains/real-estate/canonical-types";

interface Props {
  property: Property;
}

export function InvestmentEstimator({ property }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [interestRate, setInterestRate] = useState(5);
  const [loanTermYears, setLoanTermYears] = useState(25);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [estimatedMonthlyRent, setEstimatedMonthlyRent] = useState(() => {
    if (property.listingType === "rent") return property.price;
    return Math.round(property.price * 0.005);
  });

  const analysis = useMemo(() => {
    const price = property.price;
    const areaSqm = property.area ?? 0;
    const areaSqft = areaSqm * (property.areaUnit === "sqm" ? 10.764 : 1);

    const pricePerSqm = areaSqm > 0 ? Math.round(price / areaSqm) : 0;
    const pricePerSqft = areaSqft > 0 ? Math.round(price / areaSqft) : 0;

    const downPayment = price * (downPaymentPct / 100);
    const loanAmount = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;

    let monthlyMortgage = 0;
    if (monthlyRate > 0 && numPayments > 0) {
      monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    const annualPropertyTax = price * 0.005;
    const annualInsurance = price * 0.003;
    const monthlyPITI = monthlyMortgage + (annualPropertyTax / 12) + (annualInsurance / 12);

    const annualRent = estimatedMonthlyRent * 12;
    const grossYield = price > 0 ? (annualRent / price) * 100 : 0;

    const monthlyRentEquivalent = estimatedMonthlyRent;
    const buyVsRent = monthlyPITI > 0 && monthlyRentEquivalent > 0
      ? monthlyPITI < monthlyRentEquivalent * 1.1 ? "buy" : "rent"
      : null;

    const areaAvgPricePerSqm = property.address.country === "AE" ? 13000
      : property.address.country === "KE" ? 1800
      : property.address.country === "FR" ? 5500
      : 8000;
    const areaAvgPricePerSqft = Math.round(areaAvgPricePerSqm / 10.764);
    const vsAreaAvgPct = pricePerSqm > 0 ? Math.round(((pricePerSqm - areaAvgPricePerSqm) / areaAvgPricePerSqm) * 100) : 0;

    return {
      pricePerSqm,
      pricePerSqft,
      monthlyMortgage: Math.round(monthlyMortgage),
      monthlyPITI: Math.round(monthlyPITI),
      downPayment: Math.round(downPayment),
      loanAmount: Math.round(loanAmount),
      grossYield: grossYield.toFixed(1),
      buyVsRent,
      annualRent,
      areaAvgPricePerSqm,
      areaAvgPricePerSqft,
      vsAreaAvgPct,
    };
  }, [property, interestRate, loanTermYears, downPaymentPct, estimatedMonthlyRent]);

  const isSale = property.listingType === "sale";

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={18} style={{ color: "hsl(var(--accent))" }} />
          <span className="text-sm font-bold" style={{ color: "hsl(226 24% 14%)" }}>Investment Analysis</span>
        </div>
        {expanded ? <ChevronUp size={16} color="#999" /> : <ChevronDown size={16} color="#999" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {property.area && property.area > 0 && (
              <>
                <div className="p-3 rounded-xl" style={{ background: "#f8f9fa" }}>
                  <p className="text-[10px] text-[#999] uppercase tracking-wider mb-1">Price / m²</p>
                  <p className="text-sm font-bold" style={{ color: "hsl(226 24% 14%)" }}>
                    {property.currency} {analysis.pricePerSqm.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "#f8f9fa" }}>
                  <p className="text-[10px] text-[#999] uppercase tracking-wider mb-1">Price / sqft</p>
                  <p className="text-sm font-bold" style={{ color: "hsl(226 24% 14%)" }}>
                    {property.currency} {analysis.pricePerSqft.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2 p-3 rounded-xl" style={{ background: analysis.vsAreaAvgPct <= 0 ? "#ecfdf5" : "#fef2f2" }}>
                  <p className="text-[10px] text-[#999] uppercase tracking-wider mb-1">vs Area Average</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: "hsl(226 24% 14%)" }}>
                      {property.currency} {analysis.areaAvgPricePerSqm.toLocaleString()}/m²
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                      background: analysis.vsAreaAvgPct <= 0 ? "#d1fae5" : "#fecaca",
                      color: analysis.vsAreaAvgPct <= 0 ? "#065f46" : "#991b1b",
                    }}>
                      {analysis.vsAreaAvgPct > 0 ? "+" : ""}{analysis.vsAreaAvgPct}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {isSale && (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(226 24% 14%)" }}>
                  <Calculator size={14} /> Monthly Payment Estimate
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#666]">Down Payment</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={50}
                        value={downPaymentPct}
                        onChange={e => setDownPaymentPct(Number(e.target.value))}
                        className="w-20 h-1 accent-blue-500"
                      />
                      <span className="text-xs font-bold w-8 text-right">{downPaymentPct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#666]">Interest Rate</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={2}
                        max={10}
                        step={0.25}
                        value={interestRate}
                        onChange={e => setInterestRate(Number(e.target.value))}
                        className="w-20 h-1 accent-blue-500"
                      />
                      <span className="text-xs font-bold w-10 text-right">{interestRate}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#666]">Loan Term</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={30}
                        value={loanTermYears}
                        onChange={e => setLoanTermYears(Number(e.target.value))}
                        className="w-20 h-1 accent-blue-500"
                      />
                      <span className="text-xs font-bold w-10 text-right">{loanTermYears}yr</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "hsl(var(--accent) / 0.08)" }}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#666]">Down Payment</span>
                    <span className="font-semibold">{property.currency} {analysis.downPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#666]">Monthly Mortgage</span>
                    <span className="font-semibold">{property.currency} {analysis.monthlyMortgage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: "#e5e7eb" }}>
                    <span className="font-bold">Est. Monthly (PITI)</span>
                    <span className="font-extrabold" style={{ color: "hsl(var(--accent))" }}>
                      {property.currency} {analysis.monthlyPITI.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(226 24% 14%)" }}>
                  <BarChart3 size={14} /> Rental Yield Estimate
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#666]">Est. Monthly Rent</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[#999]">{property.currency}</span>
                    <input
                      type="number"
                      value={estimatedMonthlyRent}
                      onChange={e => setEstimatedMonthlyRent(Number(e.target.value) || 0)}
                      className="w-24 text-xs font-bold text-right px-2 py-1 rounded-lg border"
                      style={{ borderColor: "#e5e7eb" }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: "#f0fdf4" }}>
                    <p className="text-[10px] text-[#999] mb-1">Gross Yield</p>
                    <p className="text-lg font-extrabold" style={{ color: Number(analysis.grossYield) >= 5 ? "#16a34a" : "#d97706" }}>
                      {analysis.grossYield}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: "#f0f9ff" }}>
                    <p className="text-[10px] text-[#999] mb-1">Annual Income</p>
                    <p className="text-sm font-bold" style={{ color: "hsl(226 24% 14%)" }}>
                      {property.currency} {analysis.annualRent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {analysis.buyVsRent && (
                <div className="p-3 rounded-xl flex items-center gap-3" style={{
                  background: analysis.buyVsRent === "buy" ? "#f0fdf4" : "#fef9ee",
                  border: `1px solid ${analysis.buyVsRent === "buy" ? "#bbf7d0" : "#fde68a"}`,
                }}>
                  <DollarSign size={18} style={{ color: analysis.buyVsRent === "buy" ? "#16a34a" : "#d97706" }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: "hsl(226 24% 14%)" }}>
                      {analysis.buyVsRent === "buy" ? "Buying may be more cost-effective" : "Renting may be more cost-effective"}
                    </p>
                    <p className="text-[10px] text-[#666] mt-0.5">
                      Monthly cost: {property.currency} {analysis.monthlyPITI.toLocaleString()} (buy) vs {property.currency} {estimatedMonthlyRent.toLocaleString()} (rent)
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
