import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function AppBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: "Home", path: "/" },
    { label: "Discover", path: "/discover" },
    { label: "Radar", path: "/super-map" },
    { label: "Wallet", path: "/dashboard/wallet" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 100,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        padding: 8,
        borderRadius: 18,
        background: "rgba(9,16,32,0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              border: 0,
              borderRadius: 14,
              padding: "12px 10px",
              fontWeight: 700,
              background: active ? "#38bdf8" : "transparent",
              color: active ? "#04152f" : "white",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
