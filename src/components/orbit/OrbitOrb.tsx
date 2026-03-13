/**
 * OrbitOrb — Central animated 3D orb with contextual glow.
 * Uses Three.js for a premium, living orb effect.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import { useRef, useMemo } from "react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import * as THREE from "three";

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { alerts, syncStatus } = useOrbitEngine();

  // Determine color based on state
  const color = useMemo(() => {
    if (syncStatus === "error") return "#ef4444";
    if (alerts.some((a) => a.type === "warning")) return "#f59e0b";
    if (alerts.length > 0) return "#d4a853";
    return "#d4a853"; // Gold default
  }, [alerts, syncStatus]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    const scale = 1 + Math.sin(clock.getElapsedTime() * 0.8) * 0.03;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <Sphere ref={meshRef} args={[1.2, 64, 64]}>
      <MeshDistortMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.2}
        metalness={0.8}
        distort={0.25}
        speed={1.5}
        transparent
        opacity={0.9}
      />
    </Sphere>
  );
}

interface OrbitOrbProps {
  contextMessage?: string;
  className?: string;
}

export default function OrbitOrb({ contextMessage, className = "" }: OrbitOrbProps) {
  const { alerts } = useOrbitEngine();
  const displayMessage = contextMessage || alerts[0]?.message || "All systems operational";
  const displayIcon = alerts[0]?.icon || "✨";

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* 3D Orb */}
      <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
        <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={1} color="#d4a853" />
          <pointLight position={[-5, -3, -5]} intensity={0.5} color="#1a1a2e" />
          <AnimatedSphere />
        </Canvas>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full pointer-events-none" 
          style={{ boxShadow: "var(--hud-glow-strong)" }} 
        />
      </div>

      {/* Context message */}
      <div className="mt-4 text-center animate-fade-in">
        <span className="text-2xl">{displayIcon}</span>
        <p className="text-sm font-medium mt-1" style={{ color: "hsl(var(--hud-text))" }}>
          {displayMessage}
        </p>
      </div>
    </div>
  );
}
