/**
 * SearchRowShell — Canonical shell for orbit search result rows.
 * Single-purpose: avatar + primary text + secondary text + action area.
 */
import { memo, type ReactNode } from "react";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";

interface Props {
  name: string;
  avatarUrl?: string | null;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}

function SearchRowShell({ name, avatarUrl, subtitle, trailing, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 min-h-[56px] transition-colors hover:bg-muted/10 active:scale-[0.995]"
    >
      <IdentityAvatar avatarUrl={avatarUrl} name={name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">{name}</p>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </button>
  );
}

export default memo(SearchRowShell);
