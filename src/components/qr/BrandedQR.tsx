/**
 * BrandedQR — Single canonical QR code component with Easy-Locs logo.
 * Use this everywhere instead of raw QRCodeSVG / QRCode.
 * Logo: /logo-icon.png (must exist in public/)
 */
import { QRCodeSVG } from "qrcode.react";

interface BrandedQRProps {
  value: string;
  size?: number;
  darkMode?: boolean;
  className?: string;
}

const LOGO_SRC = "/logo-icon.png";

export default function BrandedQR({ value, size = 200, darkMode = false, className }: BrandedQRProps) {
  const logoSize = Math.round(size * 0.22);

  return (
    <div
      className={`relative rounded-2xl p-5 inline-flex items-center justify-center ${className ?? ""}`}
      style={{ background: darkMode ? "hsl(var(--card))" : "#ffffff" }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={false}
        bgColor={darkMode ? "transparent" : "#ffffff"}
        fgColor={darkMode ? "hsl(var(--foreground))" : "#1a1a2e"}
        imageSettings={{
          src: LOGO_SRC,
          x: undefined,
          y: undefined,
          height: logoSize,
          width: logoSize,
          excavate: true,
        }}
      />
      {/* Easy-Locs badge */}
      <div
        className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider"
        style={{
          background: darkMode ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary) / 0.08)",
          color: darkMode ? "hsl(var(--primary))" : "hsl(var(--primary))",
        }}
      >
        EASY-LOCS
      </div>
    </div>
  );
}
