import { useParams } from "react-router-dom";

const KNOWN_SECTIONS = [
  "overview",
  "agents",
  "runs",
  "command",
  "approvals",
  "autonomy",
  "engines",
  "master",
] as const;

type KnownSection = (typeof KNOWN_SECTIONS)[number];

function isKnownSection(value: string | undefined): value is KnownSection {
  return !!value && (KNOWN_SECTIONS as readonly string[]).includes(value);
}

export default function AdminControlShellPage() {
  const { section } = useParams<{ section?: string }>();
  const resolved: string = isKnownSection(section)
    ? section
    : section
      ? `unknown:${section}`
      : "overview";

  return (
    <div
      data-testid="admin-control-shell"
      data-section={resolved}
      style={{
        minHeight: "100vh",
        padding: "32px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            opacity: 0.6,
            margin: 0,
          }}
        >
          Admin Control
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: "4px 0 0" }}>
          Section: {resolved}
        </h1>
      </header>
      <nav aria-label="admin-control-sections" />
    </div>
  );
}
