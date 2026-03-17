// @ts-nocheck
/**
 * Isolated 3D Globe Scene — all Three.js imports are contained here.
 * This file is lazy-loaded to prevent crashes from propagating.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import type { CountryData } from "./WorldPropertyMap";

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function PropertyMarker({
  country, radius, onHover, onSelect, isHovered,
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
      <mesh>
        <ringGeometry args={[markerSize * 1.3, markerSize * 1.8, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={isHovered ? 0.5 : 0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        ref={meshRef}
        onPointerEnter={() => onHover(country.code)}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect(country.code); }}
      >
        <sphereGeometry args={[markerSize, 16, 16]} />
        <meshStandardMaterial
          color={isHovered ? "#f59e0b" : "#3b82f6"}
          emissive={isHovered ? "#f59e0b" : "#3b82f6"}
          emissiveIntensity={isHovered ? 0.8 : 0.4}
        />
      </mesh>
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
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial map={texture} roughness={0.45} metalness={0.15} />
        </mesh>
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

interface Props {
  countries: (CountryData & { lat: number; lng: number })[];
  hoveredCountry: string | null;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}

export default function WorldPropertyMap3D({ countries, hoveredCountry, onHover, onSelect }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 42 }}
      style={{ background: "transparent" }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
    >
      <GlobeScene
        countries={countries}
        hoveredCountry={hoveredCountry}
        onHover={onHover}
        onSelect={onSelect}
      />
    </Canvas>
  );
}
