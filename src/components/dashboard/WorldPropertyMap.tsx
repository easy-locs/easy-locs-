import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Building, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Approximate lon/lat → SVG viewBox(0 0 1000 500) projection (equirectangular)
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
  FR: { x: 510, y: 155 }, DE: { x: 530, y: 140 }, ES: { x: 490, y: 175 },
  IT: { x: 540, y: 165 }, PT: { x: 475, y: 175 }, NL: { x: 520, y: 138 },
  BE: { x: 515, y: 142 }, GB: { x: 498, y: 130 }, CH: { x: 525, y: 155 },
  AT: { x: 545, y: 150 }, PL: { x: 555, y: 138 }, SE: { x: 545, y: 105 },
  NO: { x: 530, y: 100 }, DK: { x: 530, y: 120 }, FI: { x: 570, y: 95 },
  IE: { x: 482, y: 130 }, GR: { x: 565, y: 175 }, CZ: { x: 545, y: 145 },
  HU: { x: 555, y: 155 }, RO: { x: 570, y: 155 }, HR: { x: 548, y: 160 },
  BG: { x: 570, y: 165 }, SK: { x: 555, y: 148 }, LU: { x: 518, y: 145 },
  US: { x: 230, y: 165 }, CA: { x: 250, y: 120 }, MX: { x: 220, y: 210 },
  BR: { x: 340, y: 300 }, AR: { x: 310, y: 360 }, CO: { x: 280, y: 250 },
  CL: { x: 300, y: 350 }, PE: { x: 280, y: 290 }, UY: { x: 325, y: 345 },
  EC: { x: 270, y: 265 }, CR: { x: 240, y: 230 }, PA: { x: 250, y: 235 },
  MA: { x: 490, y: 190 }, TN: { x: 530, y: 190 }, ZA: { x: 570, y: 355 },
  NG: { x: 520, y: 240 }, SN: { x: 468, y: 225 }, EG: { x: 580, y: 200 },
  KE: { x: 600, y: 270 }, GH: { x: 498, y: 240 }, CI: { x: 490, y: 240 },
  AE: { x: 640, y: 210 }, SA: { x: 620, y: 210 }, QA: { x: 635, y: 210 },
  TR: { x: 585, y: 175 }, IL: { x: 590, y: 195 }, LB: { x: 590, y: 190 },
  IN: { x: 700, y: 215 }, TH: { x: 740, y: 230 }, SG: { x: 745, y: 260 },
  MY: { x: 745, y: 255 }, JP: { x: 815, y: 165 }, KR: { x: 800, y: 170 },
  CN: { x: 755, y: 175 }, HK: { x: 770, y: 205 }, AU: { x: 810, y: 350 },
  NZ: { x: 870, y: 380 }, PH: { x: 785, y: 230 }, ID: { x: 765, y: 270 },
  UA: { x: 580, y: 140 }, RS: { x: 555, y: 160 },
};

interface CountryData {
  code: string;
  count: number;
  flag: string;
  name: string;
}

interface Props {
  propertiesByCountry: CountryData[];
  userCountry: string;
}

export default function WorldPropertyMap({ propertiesByCountry, userCountry }: Props) {
  const { t } = useI18n();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const totalProperties = useMemo(
    () => propertiesByCountry.reduce((s, c) => s + c.count, 0),
    [propertiesByCountry]
  );

  const countriesOnMap = useMemo(
    () => propertiesByCountry.filter(c => COUNTRY_COORDS[c.code]).map(c => ({
      ...c,
      ...COUNTRY_COORDS[c.code],
    })),
    [propertiesByCountry]
  );

  if (propertiesByCountry.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="mb-8"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-accent" />
        {t("page.dashboard.world_map") || "Portefeuille mondial"}
        <span className="text-sm font-normal text-muted-foreground ml-2">
          {totalProperties} {t("page.dashboard.properties_in") || "biens dans"} {propertiesByCountry.length} {t("page.dashboard.countries") || "pays"}
        </span>
      </h2>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {/* SVG Map */}
        <div className="relative p-4">
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-auto"
            style={{ maxHeight: 320 }}
          >
            {/* World outline hint */}
            <rect x="0" y="0" width="1000" height="500" fill="hsl(var(--muted)/0.15)" rx="8" />
            
            {/* Grid lines */}
            {[100, 200, 300, 400].map(y => (
              <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            ))}
            {[200, 400, 600, 800].map(x => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="500" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            ))}

            {/* Continent labels */}
            <text x="230" y="90" fill="hsl(var(--muted-foreground))" fontSize="11" opacity="0.4" textAnchor="middle">AMERICAS</text>
            <text x="530" y="85" fill="hsl(var(--muted-foreground))" fontSize="11" opacity="0.4" textAnchor="middle">EUROPE</text>
            <text x="530" y="280" fill="hsl(var(--muted-foreground))" fontSize="11" opacity="0.4" textAnchor="middle">AFRICA</text>
            <text x="720" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" opacity="0.4" textAnchor="middle">ASIA</text>
            <text x="820" y="310" fill="hsl(var(--muted-foreground))" fontSize="11" opacity="0.4" textAnchor="middle">OCEANIA</text>

            {/* Property markers */}
            <TooltipProvider>
              {countriesOnMap.map((c) => {
                const isHovered = hoveredCountry === c.code;
                const radius = Math.min(6 + c.count * 2, 18);
                return (
                  <g key={c.code}>
                    {/* Pulse animation for hovered */}
                    {isHovered && (
                      <circle
                        cx={c.x} cy={c.y} r={radius + 6}
                        fill="hsl(var(--accent))" opacity="0.15"
                      >
                        <animate attributeName="r" from={radius + 2} to={radius + 12} dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.2" to="0" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={c.x} cy={c.y} r={radius}
                      fill={isHovered ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                      stroke="hsl(var(--primary-foreground))"
                      strokeWidth="2"
                      opacity={isHovered ? 1 : 0.85}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredCountry(c.code)}
                      onMouseLeave={() => setHoveredCountry(null)}
                    />
                    <text
                      x={c.x} y={c.y + 1}
                      textAnchor="middle" dominantBaseline="central"
                      fill="hsl(var(--primary-foreground))"
                      fontSize={radius > 10 ? "10" : "8"}
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {c.count}
                    </text>
                  </g>
                );
              })}
            </TooltipProvider>
          </svg>

          {/* Hover tooltip overlay */}
          {hoveredCountry && (() => {
            const c = countriesOnMap.find(x => x.code === hoveredCountry);
            if (!c) return null;
            return (
              <div
                className="absolute bg-popover text-popover-foreground shadow-lg rounded-lg px-3 py-2 text-sm border border-border pointer-events-none z-10"
                style={{
                  left: `${(c.x / 1000) * 100}%`,
                  top: `${(c.y / 500) * 100}%`,
                  transform: "translate(-50%, -120%)",
                }}
              >
                <span className="font-semibold">{c.flag} {c.name}</span>
                <span className="text-muted-foreground ml-2">{c.count} {c.count > 1 ? "biens" : "bien"}</span>
              </div>
            );
          })()}
        </div>

        {/* Country list */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {propertiesByCountry.map((c) => (
              <Link
                key={c.code}
                to={`/dashboard/rental?tab=properties&country=${c.code}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-accent/10 text-sm font-medium text-foreground transition-colors border border-border/50"
                onMouseEnter={() => setHoveredCountry(c.code)}
                onMouseLeave={() => setHoveredCountry(null)}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">{c.count}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
