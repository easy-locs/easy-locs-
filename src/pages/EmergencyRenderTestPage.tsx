export default function EmergencyRenderTestPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#ff0000",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: "bold",
      }}
    >
      EMERGENCY TEST PAGE VISIBLE
    </div>
  );
}
