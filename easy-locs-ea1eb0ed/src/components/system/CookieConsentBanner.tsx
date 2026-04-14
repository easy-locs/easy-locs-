import { useState, useEffect } from "react";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import {
  hasConsented,
  acceptAll,
  rejectAll,
  setConsent,
  type CookieCategory,
} from "@/lib/consent/cookie-consent";

const GOLD = "hsl(38 65% 56%)";
const NAVY = "hsl(220 40% 18%)";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!hasConsented()) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleAcceptAll = () => {
    acceptAll();
    setVisible(false);
  };

  const handleRejectAll = () => {
    rejectAll();
    setVisible(false);
  };

  const handleSaveCustom = () => {
    setConsent(analytics, marketing);
    setVisible(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: NAVY,
        color: "#fff",
        borderTop: `2px solid ${GOLD}`,
        padding: "16px 20px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <Shield style={{ width: 20, height: 20, color: GOLD, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              We respect your privacy
            </p>
            <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
              We use cookies to improve your experience. You can choose which categories to allow.
              Essential cookies are always active. See our{" "}
              <a href="/#/cookies" style={{ color: GOLD, textDecoration: "underline" }}>Cookie Policy</a>
              {" "}and{" "}
              <a href="/#/privacy" style={{ color: GOLD, textDecoration: "underline" }}>Privacy Policy</a>.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: GOLD,
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: expanded ? 12 : 0,
            padding: 0,
          }}
        >
          Customize choices
          {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
        </button>

        {expanded && (
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <CookieToggle
              label="Essential cookies"
              description="Required for the app to function (auth, session, language)"
              checked={true}
              disabled={true}
            />
            <CookieToggle
              label="Analytics cookies"
              description="Help us understand how you use the app (PostHog, Sentry)"
              checked={analytics}
              onChange={setAnalytics}
            />
            <CookieToggle
              label="Marketing cookies"
              description="Used for personalized promotions and recommendations"
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleRejectAll}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reject all
          </button>
          {expanded ? (
            <button
              onClick={handleSaveCustom}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: GOLD,
                color: NAVY,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save preferences
            </button>
          ) : (
            <button
              onClick={handleAcceptAll}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: GOLD,
                color: NAVY,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Accept all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CookieToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.07)",
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 11, opacity: 0.65 }}>{description}</p>
      </div>
      <label style={{ position: "relative", width: 40, height: 22, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
        />
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 11,
            background: checked ? GOLD : "rgba(255,255,255,0.2)",
            transition: "background 0.2s",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: checked ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
            }}
          />
        </span>
      </label>
    </div>
  );
}
