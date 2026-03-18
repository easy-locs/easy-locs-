/**
 * EasyLocsRadarOverlay — futuristic concentric rings + sweep animation
 * rendered as a CSS overlay on top of the Mapbox map.
 */

export default function EasyLocsRadarOverlay({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;

  return (
    <div className="easylocs-radar-shell">
      {/* Concentric rings */}
      <div
        className="easylocs-radar-ring"
        style={{ width: "60%", height: "60%", top: "20%", left: "20%" }}
      />
      <div
        className="easylocs-radar-ring"
        style={{ width: "85%", height: "85%", top: "7.5%", left: "7.5%" }}
      />
      <div
        className="easylocs-radar-ring"
        style={{ width: "110%", height: "110%", top: "-5%", left: "-5%", opacity: 0.5 }}
      />
      {/* Sweep */}
      <div className="easylocs-radar-sweep" />
    </div>
  );
}
