import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

// Simplified world map SVG paths (continent outlines)
const CONTINENT_PATHS = {
  northAmerica: "M150,60 L180,55 L220,60 L260,70 L290,90 L310,120 L300,140 L280,160 L260,180 L240,200 L220,210 L200,220 L180,210 L160,200 L140,180 L130,160 L120,140 L115,120 L120,100 L130,80 Z",
  southAmerica: "M260,240 L290,230 L320,240 L340,260 L350,290 L355,320 L340,350 L320,370 L300,385 L285,370 L275,350 L265,320 L260,290 L255,260 Z",
  europe: "M480,70 L500,65 L530,68 L560,75 L580,85 L585,100 L580,120 L570,140 L560,155 L545,165 L530,170 L510,168 L495,160 L485,150 L478,135 L475,120 L476,100 L478,85 Z",
  africa: "M470,190 L490,185 L520,188 L545,195 L565,210 L580,235 L585,265 L580,295 L570,325 L555,350 L535,365 L515,370 L495,365 L478,350 L465,325 L460,295 L458,265 L462,235 L465,210 Z",
  asia: "M590,60 L640,55 L700,60 L750,70 L790,85 L810,105 L815,130 L810,155 L800,175 L780,195 L755,210 L730,220 L700,225 L670,218 L645,205 L625,185 L610,165 L600,145 L592,120 L590,95 Z",
  oceania: "M760,300 L790,290 L830,295 L860,310 L870,335 L860,355 L840,365 L810,370 L785,365 L765,350 L758,330 L758,315 Z",
};

// Country coordinates on our map
const COUNTRY_COORDS: Record<string, { x: number; y: number; continent: string }> = {
  // Europe
  FR: { x: 505, y: 128, continent: "europe" }, DE: { x: 528, y: 115, continent: "europe" },
  ES: { x: 490, y: 148, continent: "europe" }, IT: { x: 535, y: 140, continent: "europe" },
  PT: { x: 478, y: 148, continent: "europe" }, NL: { x: 518, y: 108, continent: "europe" },
  BE: { x: 512, y: 112, continent: "europe" }, GB: { x: 495, y: 100, continent: "europe" },
  CH: { x: 522, y: 125, continent: "europe" }, AT: { x: 540, y: 122, continent: "europe" },
  PL: { x: 550, y: 108, continent: "europe" }, SE: { x: 540, y: 82, continent: "europe" },
  NO: { x: 525, y: 78, continent: "europe" }, DK: { x: 530, y: 95, continent: "europe" },
  FI: { x: 560, y: 78, continent: "europe" }, IE: { x: 483, y: 100, continent: "europe" },
  GR: { x: 555, y: 148, continent: "europe" }, CZ: { x: 540, y: 115, continent: "europe" },
  HU: { x: 548, y: 125, continent: "europe" }, RO: { x: 560, y: 128, continent: "europe" },
  HR: { x: 543, y: 132, continent: "europe" }, BG: { x: 562, y: 135, continent: "europe" },
  SK: { x: 548, y: 118, continent: "europe" }, LU: { x: 514, y: 116, continent: "europe" },
  UA: { x: 572, y: 110, continent: "europe" }, RS: { x: 552, y: 132, continent: "europe" },
  // Americas
  US: { x: 210, y: 130, continent: "northAmerica" }, CA: { x: 220, y: 90, continent: "northAmerica" },
  MX: { x: 195, y: 185, continent: "northAmerica" },
  BR: { x: 320, y: 300, continent: "southAmerica" }, AR: { x: 300, y: 360, continent: "southAmerica" },
  CO: { x: 275, y: 248, continent: "southAmerica" }, CL: { x: 290, y: 355, continent: "southAmerica" },
  PE: { x: 270, y: 278, continent: "southAmerica" }, UY: { x: 315, y: 348, continent: "southAmerica" },
  EC: { x: 262, y: 258, continent: "southAmerica" }, CR: { x: 230, y: 215, continent: "northAmerica" },
  PA: { x: 242, y: 220, continent: "northAmerica" },
  // Africa
  MA: { x: 482, y: 195, continent: "africa" }, TN: { x: 525, y: 195, continent: "africa" },
  ZA: { x: 548, y: 355, continent: "africa" }, NG: { x: 515, y: 255, continent: "africa" },
  SN: { x: 465, y: 238, continent: "africa" }, EG: { x: 560, y: 210, continent: "africa" },
  KE: { x: 570, y: 278, continent: "africa" }, GH: { x: 498, y: 252, continent: "africa" },
  CI: { x: 488, y: 252, continent: "africa" },
  // Middle East & Asia
  AE: { x: 640, y: 200, continent: "asia" }, SA: { x: 618, y: 205, continent: "asia" },
  QA: { x: 635, y: 198, continent: "asia" }, TR: { x: 585, y: 145, continent: "asia" },
  IL: { x: 588, y: 175, continent: "asia" }, LB: { x: 586, y: 170, continent: "asia" },
  IN: { x: 700, y: 195, continent: "asia" }, TH: { x: 740, y: 205, continent: "asia" },
  SG: { x: 748, y: 228, continent: "asia" }, MY: { x: 745, y: 222, continent: "asia" },
  JP: { x: 805, y: 135, continent: "asia" }, KR: { x: 790, y: 145, continent: "asia" },
  CN: { x: 748, y: 150, continent: "asia" }, HK: { x: 762, y: 185, continent: "asia" },
  PH: { x: 778, y: 205, continent: "asia" }, ID: { x: 760, y: 240, continent: "asia" },
  // Oceania
  AU: { x: 815, y: 340, continent: "oceania" }, NZ: { x: 862, y: 365, continent: "oceania" },
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

  const activeContinent = useMemo(() => {
    const set = new Set(countriesOnMap.map(c => c.continent));
    return set;
  }, [countriesOnMap]);

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

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        {/* Map area */}
        <div className="relative bg-gradient-to-br from-muted/30 via-background to-muted/20 p-2 sm:p-4">
          <svg
            viewBox="0 0 1000 430"
            className="w-full h-auto"
            style={{ maxHeight: 380 }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Decorative ocean grid */}
            <defs>
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.03" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
              </linearGradient>
              <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </radialGradient>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="hsl(var(--primary))" floodOpacity="0.3" />
              </filter>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="1000" height="430" fill="url(#oceanGrad)" rx="12" />

            {/* Subtle latitude lines */}
            {[85, 170, 255, 340].map(y => (
              <line key={`lat${y}`} x1="20" y1={y} x2="980" y2={y}
                stroke="hsl(var(--border))" strokeWidth="0.4" strokeDasharray="6 8" opacity="0.2" />
            ))}
            {[170, 340, 510, 680, 850].map(x => (
              <line key={`lon${x}`} x1={x} y1="10" x2={x} y2="420"
                stroke="hsl(var(--border))" strokeWidth="0.4" strokeDasharray="6 8" opacity="0.2" />
            ))}

            {/* Continent shapes */}
            {Object.entries(CONTINENT_PATHS).map(([key, path]) => {
              const isActive = activeContinent.has(key);
              return (
                <path
                  key={key}
                  d={path}
                  fill={isActive ? "hsl(var(--primary)/0.08)" : "hsl(var(--muted-foreground)/0.04)"}
                  stroke={isActive ? "hsl(var(--primary)/0.2)" : "hsl(var(--border)/0.3)"}
                  strokeWidth="1"
                  className="transition-colors duration-500"
                />
              );
            })}

            {/* Connection lines between properties */}
            {countriesOnMap.length > 1 && countriesOnMap.slice(0, -1).map((c, i) => {
              const next = countriesOnMap[i + 1];
              return (
                <line
                  key={`line-${i}`}
                  x1={c.x} y1={c.y} x2={next.x} y2={next.y}
                  stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.15"
                />
              );
            })}

            {/* Property markers */}
            {countriesOnMap.map((c, idx) => {
              const isHovered = hoveredCountry === c.code;
              const baseRadius = Math.min(8 + c.count * 2.5, 22);
              const radius = isHovered ? baseRadius + 3 : baseRadius;

              return (
                <g
                  key={c.code}
                  onMouseEnter={() => setHoveredCountry(c.code)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  className="cursor-pointer"
                >
                  {/* Ambient glow */}
                  <circle cx={c.x} cy={c.y} r={radius + 8}
                    fill="url(#glowGrad)" opacity={isHovered ? 0.5 : 0.2}
                    className="transition-opacity duration-300"
                  />

                  {/* Pulse ring */}
                  <circle cx={c.x} cy={c.y} r={radius} fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"
                  >
                    <animate attributeName="r" from={radius} to={radius + 14} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Main dot */}
                  <circle
                    cx={c.x} cy={c.y} r={radius}
                    fill={isHovered ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                    stroke="hsl(var(--card))"
                    strokeWidth="2.5"
                    filter="url(#shadow)"
                    className="transition-all duration-200"
                  >
                    <animate attributeName="r" values={`${radius};${radius + 1};${radius}`} dur="3s" repeatCount="indefinite" begin={`${idx * 0.3}s`} />
                  </circle>

                  {/* Inner ring */}
                  <circle cx={c.x} cy={c.y} r={radius - 3}
                    fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" opacity="0.4"
                  />

                  {/* Count label */}
                  <text
                    x={c.x} y={c.y + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fill="hsl(var(--primary-foreground))"
                    fontSize={radius > 14 ? "12" : "9"}
                    fontWeight="700"
                    pointerEvents="none"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                  >
                    {c.count}
                  </text>

                  {/* Country code label below */}
                  {(isHovered || c.count >= 3) && (
                    <text
                      x={c.x} y={c.y + radius + 12}
                      textAnchor="middle"
                      fill="hsl(var(--foreground))"
                      fontSize="9"
                      fontWeight="600"
                      opacity={isHovered ? 1 : 0.6}
                      pointerEvents="none"
                    >
                      {c.code}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating tooltip */}
          {hoveredCountry && (() => {
            const c = countriesOnMap.find(x => x.code === hoveredCountry);
            if (!c) return null;
            const leftPct = (c.x / 1000) * 100;
            const topPct = (c.y / 430) * 100;
            return (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bg-popover/95 backdrop-blur-sm text-popover-foreground shadow-xl rounded-xl px-4 py-2.5 text-sm border border-border/80 pointer-events-none z-20"
                style={{
                  left: `${Math.min(Math.max(leftPct, 10), 90)}%`,
                  top: `${topPct}%`,
                  transform: "translate(-50%, -140%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.flag}</span>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.count} {c.count > 1 ? (t("page.dashboard.properties_plural") || "biens") : (t("page.dashboard.property_singular") || "bien")}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>

        {/* Country chips */}
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {propertiesByCountry.map((c) => (
              <Link
                key={c.code}
                to={`/dashboard/rental?tab=properties&country=${c.code}`}
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card hover:bg-accent/10 text-sm font-medium text-foreground transition-all border border-border/60 hover:border-accent/40 hover:shadow-sm"
                onMouseEnter={() => setHoveredCountry(c.code)}
                onMouseLeave={() => setHoveredCountry(null)}
              >
                <span className="text-base">{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">{c.count}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
