import { useRef, useMemo, useState, Suspense, useCallback } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import { motion } from "framer-motion";
import { Globe, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

// Convert lat/lng to 3D sphere position
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const COUNTRY_LATLNG: Record<string, { lat: number; lng: number }> = {
  FR: { lat: 46.6, lng: 2.2 }, DE: { lat: 51.1, lng: 10.4 }, ES: { lat: 40.4, lng: -3.7 },
  IT: { lat: 41.9, lng: 12.5 }, PT: { lat: 39.4, lng: -8.2 }, NL: { lat: 52.1, lng: 5.3 },
  BE: { lat: 50.8, lng: 4.4 }, GB: { lat: 51.5, lng: -0.1 }, CH: { lat: 46.8, lng: 8.2 },
  AT: { lat: 47.5, lng: 14.5 }, PL: { lat: 51.9, lng: 19.1 }, SE: { lat: 60.1, lng: 18.6 },
  NO: { lat: 60.5, lng: 8.5 }, DK: { lat: 56.3, lng: 9.5 }, FI: { lat: 61.9, lng: 25.7 },
  IE: { lat: 53.1, lng: -8.2 }, GR: { lat: 39.1, lng: 21.8 }, CZ: { lat: 49.8, lng: 15.5 },
  HU: { lat: 47.2, lng: 19.5 }, RO: { lat: 45.9, lng: 24.9 }, HR: { lat: 45.1, lng: 15.2 },
  BG: { lat: 42.7, lng: 25.5 }, SK: { lat: 48.7, lng: 19.7 }, LU: { lat: 49.8, lng: 6.1 },
  UA: { lat: 48.4, lng: 31.2 }, RS: { lat: 44.0, lng: 21.0 },
  US: { lat: 37.1, lng: -95.7 }, CA: { lat: 56.1, lng: -106.3 }, MX: { lat: 23.6, lng: -102.5 },
  BR: { lat: -14.2, lng: -51.9 }, AR: { lat: -38.4, lng: -63.6 }, CO: { lat: 4.6, lng: -74.3 },
  CL: { lat: -35.7, lng: -71.5 }, PE: { lat: -9.2, lng: -75.0 }, UY: { lat: -32.5, lng: -55.8 },
  EC: { lat: -1.8, lng: -78.2 }, CR: { lat: 9.7, lng: -83.8 }, PA: { lat: 8.5, lng: -80.8 },
  MA: { lat: 31.8, lng: -7.1 }, TN: { lat: 33.9, lng: 9.5 }, ZA: { lat: -30.6, lng: 22.9 },
  NG: { lat: 9.1, lng: 8.7 }, SN: { lat: 14.5, lng: -14.5 }, EG: { lat: 26.8, lng: 30.8 },
  KE: { lat: -0.0, lng: 37.9 }, GH: { lat: 7.9, lng: -1.0 }, CI: { lat: 7.5, lng: -5.5 },
  AE: { lat: 23.4, lng: 53.8 }, SA: { lat: 23.9, lng: 45.1 }, QA: { lat: 25.4, lng: 51.2 },
  TR: { lat: 38.9, lng: 35.2 }, IL: { lat: 31.0, lng: 34.9 }, LB: { lat: 33.9, lng: 35.9 },
  IN: { lat: 20.6, lng: 79.0 }, TH: { lat: 15.9, lng: 100.9 }, SG: { lat: 1.4, lng: 103.8 },
  MY: { lat: 4.2, lng: 101.9 }, JP: { lat: 36.2, lng: 138.3 }, KR: { lat: 35.9, lng: 127.8 },
  CN: { lat: 35.9, lng: 104.2 }, HK: { lat: 22.4, lng: 114.1 }, AU: { lat: -25.3, lng: 133.8 },
  NZ: { lat: -40.9, lng: 174.9 }, PH: { lat: 12.9, lng: 121.8 }, ID: { lat: -0.8, lng: 113.9 },
};

interface CountryData {
  code: string;
  count: number;
  flag: string;
  name: string;
}

// --- Property marker on globe ---
function PropertyMarker({
  country,
  radius,
  onHover,
  onSelect,
  isHovered,
}: {
  country: CountryData & { lat: number; lng: number };
  radius: number;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
  isHovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToVector3(country.lat, country.lng, radius), [country.lat, country.lng, radius]);
  const markerSize = Math.min(0.02 + country.count * 0.008, 0.06);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const scale = isHovered ? 1.6 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), delta * 8);
    }
  });

  return (
    <group position={pos}>
      {/* Glow ring */}
      <mesh>
        <ringGeometry args={[markerSize * 1.3, markerSize * 1.8, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={isHovered ? 0.5 : 0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* Main dot */}
      <mesh
        ref={meshRef}
        onPointerEnter={() => onHover(country.code)}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect(country.code); }}
        style={{ cursor: "pointer" }}
      >
        <sphereGeometry args={[markerSize, 16, 16]} />
        <meshStandardMaterial
          color={isHovered ? "#f59e0b" : "#3b82f6"}
          emissive={isHovered ? "#f59e0b" : "#3b82f6"}
          emissiveIntensity={isHovered ? 0.8 : 0.4}
        />
      </mesh>
      {/* HTML label */}
      {isHovered && (
        <Html distanceFactor={3} center style={{ pointerEvents: "none" }}>
          <div className="bg-popover/95 backdrop-blur-sm text-popover-foreground shadow-xl rounded-xl px-3 py-2 border border-border/80 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-base">{country.flag}</span>
              <div>
                <div className="font-semibold text-sm">{country.name}</div>
                <div className="text-xs text-muted-foreground">{country.count} {country.count > 1 ? "biens" : "bien"}</div>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- Globe sphere ---
// --- Scene (globe + markers rotate together) ---
function GlobeScene({ countries, hoveredCountry, onHover, onSelect }: {
  countries: (CountryData & { lat: number; lng: number })[];
  hoveredCountry: string | null;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(TextureLoader, "/textures/earth-map.jpg");

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <directionalLight position={[-3, 2, -4]} intensity={0.5} color="#93c5fd" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#60a5fa" />

      <group ref={groupRef}>
        {/* Earth sphere */}
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial map={texture} roughness={0.45} metalness={0.15} />
        </mesh>

        {/* Property markers — inside the same rotating group */}
        {countries.map(c => (
          <PropertyMarker
            key={c.code}
            country={c}
            radius={1.04}
            onHover={onHover}
            onSelect={onSelect}
            isHovered={hoveredCountry === c.code}
          />
        ))}
      </group>

      {/* Atmosphere glow (static, outside rotation) */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={1.8}
        maxDistance={4}
        autoRotate
        autoRotateSpeed={0.5}
        rotateSpeed={0.5}
      />
    </>
  );
}

// --- Main component ---
interface Props {
  propertiesByCountry: CountryData[];
  userCountry: string;
}

export default function WorldPropertyMap({ propertiesByCountry, userCountry }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const totalProperties = useMemo(
    () => propertiesByCountry.reduce((s, c) => s + c.count, 0),
    [propertiesByCountry]
  );

  const countriesWithCoords = useMemo(
    () => propertiesByCountry
      .filter(c => COUNTRY_LATLNG[c.code])
      .map(c => ({ ...c, ...COUNTRY_LATLNG[c.code] })),
    [propertiesByCountry]
  );

  const handleHover = useCallback((code: string | null) => setHoveredCountry(code), []);
  const handleSelect = useCallback((code: string) => {
    navigate(`/dashboard/country/${code.toLowerCase()}`);
  }, [navigate]);

  if (propertiesByCountry.length === 0) return null;

  const mapTitle = t("page.dashboard.world_map");
  const titleText = (!mapTitle || mapTitle === "page.dashboard.world_map") ? "Mon portefeuille mondial" : mapTitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="mb-8"
    >
      {/* Clean header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">{titleText}</h2>
            <p className="text-xs text-muted-foreground">
              {totalProperties} {totalProperties > 1 ? "biens" : "bien"} · {propertiesByCountry.length} {propertiesByCountry.length > 1 ? "pays" : "pays"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        {/* 3D Globe */}
        <div className="relative w-full" style={{ height: 320 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-transparent to-background/30 pointer-events-none z-10 rounded-t-2xl" />
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-muted/10">
              <Globe className="h-10 w-10 text-muted-foreground animate-spin" />
            </div>
          }>
            <Canvas
              camera={{ position: [0, 0, 2.6], fov: 42 }}
              style={{ background: "transparent" }}
              dpr={[1, 2]}
            >
              <GlobeScene
                countries={countriesWithCoords}
                hoveredCountry={hoveredCountry}
                onHover={handleHover}
              />
            </Canvas>
          </Suspense>
        </div>

        {/* Country chips — horizontal scroll */}
        <div className="border-t border-border/40 bg-muted/10 px-2 sm:px-4 py-3 relative group/scroll">
          {/* Left arrow (desktop) */}
          {propertiesByCountry.length > 4 && (
            <button
              onClick={() => {
                const el = document.getElementById("country-scroll");
                if (el) el.scrollBy({ left: -200, behavior: "smooth" });
              }}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full w-8 items-center justify-center bg-gradient-to-r from-muted/40 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          <div
            id="country-scroll"
            className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {propertiesByCountry.map((c) => (
              <Link
                key={c.code}
                to={`/dashboard/rental?tab=properties&country=${c.code}`}
                className={`group snap-start shrink-0 inline-flex items-center gap-2 min-w-[140px] max-w-[180px] px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  hoveredCountry === c.code
                    ? "bg-accent/10 border-accent/40 shadow-sm text-foreground"
                    : "bg-card border-border/60 text-foreground hover:bg-accent/10 hover:border-accent/40 hover:shadow-sm"
                }`}
                onMouseEnter={() => setHoveredCountry(c.code)}
                onMouseLeave={() => setHoveredCountry(null)}
              >
                <span className="text-base shrink-0">{c.flag}</span>
                <span className="truncate flex-1">{c.name}</span>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold shrink-0">{c.count}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {/* Right arrow (desktop) */}
          {propertiesByCountry.length > 4 && (
            <button
              onClick={() => {
                const el = document.getElementById("country-scroll");
                if (el) el.scrollBy({ left: 200, behavior: "smooth" });
              }}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full w-8 items-center justify-center bg-gradient-to-l from-muted/40 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
