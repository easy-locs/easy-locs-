import { useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import { Component, type ReactNode } from "react";

/* Simple error boundary */
class GlobeErrorBoundary extends Component<{ children: ReactNode; onError?: () => void; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ── Rotating Earth ── */
function EarthSphere() {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(TextureLoader, "/textures/earth-map.jpg");

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

/* ── Scene with atmosphere ── */
function GlobeScene() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={1.0} />
      <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#93c5fd" />

      <EarthSphere />

      {/* Atmosphere glow */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        rotateSpeed={0.4}
      />
    </>
  );
}

/* ── Fallback on error ── */
function ErrorFallback() {
  return null;
}

/* ── Exported component ── */
const LandingGlobe = ({ onError }: { onError?: () => void }) => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={onError}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 40 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <GlobeScene />
      </Canvas>
    </ErrorBoundary>
  );
};

export default LandingGlobe;
