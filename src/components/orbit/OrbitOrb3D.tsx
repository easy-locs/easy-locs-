// @ts-nocheck
/**
 * OrbitOrb3D — Three.js 3D orb, loaded only on desktop.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import { useRef, useMemo } from "react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import * as THREE from "three";

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { alerts, syncStatus } = useOrbitEngine();

  const color = useMemo(() => {
    if (syncStatus === "error") return "#ef4444";
    if (alerts.some((a) => a.type === "warning")) return "#f59e0b";
    return "#d4a853";
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

export default function OrbitOrb3D() {
  return (
    <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#d4a853" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#1a1a2e" />
      <AnimatedSphere />
    </Canvas>
  );
}
