// @ts-nocheck
import { Component, type ReactNode, useRef, useMemo, Suspense, lazy, useState, useEffect } from "react";
import { Loader2, Globe } from "lucide-react";

class GlobeErrorBoundary extends Component<{ children: ReactNode; onError?: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() {
    if (this.state.hasError) return <GlobeFallback />;
    return this.props.children;
  }
}

function GlobeFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-full border border-primary-foreground/10"
      style={{ background: "hsl(var(--primary-foreground) / 0.03)" }}
    >
      <Globe className="h-24 w-24" style={{ color: "hsl(var(--accent) / 0.2)" }} />
    </div>
  );
}

const LazyGlobeCanvas = lazy(() =>
  Promise.all([
    import("@react-three/fiber"),
    import("three"),
  ]).then(([fiberMod, threeMod]) => {
    const { Canvas, useFrame, useLoader } = fiberMod;
    const THREE = threeMod;

    function EarthSphere() {
      const meshRef = useRef<THREE.Mesh>(null);
      const texture = useLoader(THREE.TextureLoader, "/textures/earth-map.jpg");

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

    function GlobeCanvasInner() {
      return (
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
      );
    }

    return { default: GlobeCanvasInner };
  })
);

interface LandingGlobeProps {
  onError?: () => void;
}

const LandingGlobe = ({ onError }: LandingGlobeProps) => {
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
        <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent/40" />
            </div>
          }
        >
          <LazyGlobeCanvas />
        </Suspense>
      </div>
    </GlobeErrorBoundary>
  );
};

export default LandingGlobe;
