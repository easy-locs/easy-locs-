
export function RadarSweep() {
  return (
    <div className="absolute inset-0 rounded-full overflow-hidden">
      {/* Sweep */}
      <div className="radar-sweep" />
      {/* Rings */}
      <div className="absolute inset-[15%] rounded-full border border-emerald-400/15" />
      <div className="absolute inset-[30%] rounded-full border border-emerald-400/10" />
      <div className="absolute inset-[45%] rounded-full border border-emerald-400/5" />
    </div>
  );
}
