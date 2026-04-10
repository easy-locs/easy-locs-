// @ts-nocheck
import { Component, type ReactNode, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { TextureLoader } from "three";
import { Loader2, Globe } from "lucide-react";

/* ── Error Boundary (class component) ── */
interface EBProps { children: ReactNode; onError?: () => void }
interface EBState { hasError: boolean }

class GlobeErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() {
    if (this.state.hasError) return <GlobeFallback />;
    return this.props.children;
  }
}

/* ── Static fallback ── */
function GlobeFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-full border border-primary-foreground/10"
      style={{ background: "hsl(var(--primary-foreground) / 0.03)" }}
    >
      <Globe className="h-24 w-24" style={{ color: "hsl(var(--accent) / 0.2)" }} />
    </div>
  );
}

/* ── 3D Earth Sphere ── */
function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(TextureLoader, "/textures/earth-map.jpg");

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  const atmosphereMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#60a5fa", transparent: true, opacity: 0.06, side: THREE.BackSide }),
    []
  );

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 3, 5]} intensity={1.1} />
      <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#93c5fd" />

      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Atmosphere glow */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive object={atmosphereMat} attach="material" />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

/* ── Main exported component ── */
interface LandingGlobeProps {
  onError?: () => void;
}

const LandingGlobe = ({ onError }: LandingGlobeProps) => {
  // Check WebGL support before rendering
  const hasWebGL = useMemo(() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  }, []);

  if (!hasWebGL) {
    onError?.();
    return <GlobeFallback />;
  }

  return (
    <GlobeErrorBoundary onError={onError}>
      <div className="relative w-full h-full">
        {/* Glow behind globe */}
        <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" aria-hidden />

        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
            </div>
          }
        >
          <Canvas
            camera={{ position: [0, 0, 2.6], fov: 42 }}
            style={{ background: "transparent" }}
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "low-power",
              failIfMajorPerformanceCaveat: true,
            }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <EarthSphere />
          </Canvas>
        </Suspense>
      </div>
    </GlobeErrorBoundary>
  );
};

export default LandingGlobe;
