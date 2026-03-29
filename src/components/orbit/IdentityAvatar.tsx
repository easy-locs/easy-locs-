/**
 * IdentityAvatar — Canonical avatar component for the entire app.
 * Single rendering path for all avatars: threads, contacts, calls, groups, headers.
 * Uses resolveCanonicalDisplayIdentity under the hood.
 */
import { memo } from "react";

interface Props {
  avatarUrl?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Online/offline/busy indicator */
  status?: "online" | "offline" | "busy" | null;
}

const SIZE_MAP = {
  xs: { container: "w-7 h-7", text: "text-[10px]", dot: "w-2 h-2" },
  sm: { container: "w-9 h-9", text: "text-xs", dot: "w-2.5 h-2.5" },
  md: { container: "w-11 h-11", text: "text-sm", dot: "w-3 h-3" },
  lg: { container: "w-14 h-14", text: "text-base", dot: "w-3.5 h-3.5" },
  xl: { container: "w-20 h-20", text: "text-xl", dot: "w-4 h-4" },
} as const;

const STATUS_COLORS = {
  online: "hsl(var(--hud-success, 142 76% 36%))",
  offline: "hsl(var(--muted-foreground))",
  busy: "hsl(var(--destructive))",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}

function IdentityAvatarInner({ avatarUrl, name, size = "md", className = "", status }: Props) {
  const s = SIZE_MAP[size];
  const initials = getInitials(name);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${s.container} rounded-full flex items-center justify-center overflow-hidden`}
        style={{
          background: avatarUrl
            ? `url(${avatarUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
          border: "1px solid hsl(var(--border) / 0.15)",
        }}
      >
        {!avatarUrl && (
          <span className={`${s.text} font-bold select-none`} style={{ color: "hsl(var(--primary))" }}>
            {initials}
          </span>
        )}
      </div>
      {status && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-2`}
          style={{
            background: STATUS_COLORS[status],
            borderColor: "hsl(var(--background))",
          }}
        />
      )}
    </div>
  );
}

export const IdentityAvatar = memo(IdentityAvatarInner);
IdentityAvatar.displayName = "IdentityAvatar";
