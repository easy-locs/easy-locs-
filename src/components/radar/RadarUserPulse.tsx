export function RadarUserPulse() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
      {/* Outer ping */}
      <div className="absolute -inset-6 rounded-full bg-primary/15 animate-ping" />
      {/* Glow ring */}
      <div className="absolute -inset-3 rounded-full bg-primary/20 animate-pulse" />
      {/* Core dot */}
      <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]" />
    </div>
  );
}
