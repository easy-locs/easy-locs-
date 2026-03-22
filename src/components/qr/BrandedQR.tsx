/**
 * BrandedQR — Single canonical QR code component with Easy-Locs logo.
 * Use this everywhere instead of raw QRCodeSVG / QRCode.
 */
import { QRCodeSVG } from "qrcode.react";

interface BrandedQRProps {
  value: string;
  size?: number;
  /** Dark mode: transparent bg with foreground color */
  darkMode?: boolean;
  className?: string;
}

const LOGO_SRC = "/logo-icon.png";

export default function BrandedQR({ value, size = 200, darkMode = false, className }: BrandedQRProps) {
  const logoSize = Math.round(size * 0.18);

  return (
    <div className={`rounded-2xl ${darkMode ? "bg-card" : "bg-white"} p-4 inline-flex items-center justify-center ${className ?? ""}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={false}
        bgColor={darkMode ? "transparent" : "#ffffff"}
        fgColor={darkMode ? "hsl(var(--foreground))" : "#000000"}
        imageSettings={{
          src: LOGO_SRC,
          x: undefined,
          y: undefined,
          height: logoSize,
          width: logoSize,
          excavate: true,
        }}
      />
    </div>
  );
}
