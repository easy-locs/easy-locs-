import { useMemo, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { Button } from "@/components/ui/button";

interface ProfileQrCardProps {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

function BrandedQrCenter({ size }: { size: number }) {
  return (
    <div
      className="rounded-lg bg-white flex items-center justify-center shadow-sm whitespace-nowrap"
      style={{ height: size + 6, paddingLeft: 6, paddingRight: 6 }}
    >
      <span className="font-bold tracking-tight leading-none" style={{ fontSize: Math.max(8, size * 0.28), color: "hsl(228 28% 7%)" }}>
        Easy
      </span>
      <span
        className="font-bold tracking-tight leading-none"
        style={{
          fontSize: Math.max(8, size * 0.28),
          background: "linear-gradient(135deg, hsl(168 72% 40%), hsl(168 78% 32%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        -Locs
      </span>
      <span className="font-bold leading-none" style={{ fontSize: Math.max(5, size * 0.15), color: "hsl(0 0% 100% / 0.3)", marginLeft: 1, verticalAlign: "super" }}>
        ®
      </span>
    </div>
  );
}

export default function ProfileQrCard({ userId, displayName, avatarUrl }: ProfileQrCardProps) {
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () => qr.profile(userId, displayName),
    [userId, displayName],
  );

  const link = useMemo(() => toResolveUrl(payload), [payload]);

  const qrSize = 200;
  const centerSize = Math.round(qrSize * 0.22);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: `${displayName} — Easy-Locs`, url: link });
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        My Profile QR
      </p>

      <div className="bg-white rounded-2xl p-4 inline-flex items-center justify-center relative">
        <QRCodeSVG
          value={link}
          size={qrSize}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#1a1a2e"
          imageSettings={{
            src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
            x: undefined,
            y: undefined,
            height: centerSize,
            width: centerSize,
            excavate: true,
          }}
        />
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {avatarUrl ? (
            <div
              style={{
                width: centerSize + 6,
                height: centerSize + 6,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#ffffff",
                border: "2px solid #ffffff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={avatarUrl}
                alt={displayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
            </div>
          ) : (
            <BrandedQrCenter size={centerSize} />
          )}
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground">{displayName}</p>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 rounded-xl gap-2 h-10 text-xs" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {"share" in navigator && (
          <Button variant="outline" className="flex-1 rounded-xl gap-2 h-10 text-xs" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        )}
      </div>
    </div>
  );
}
