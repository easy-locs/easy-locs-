/**
 * CardShell — Universal rendering wrapper that enforces CardContract states.
 * Every card MUST be wrapped in this shell to guarantee uniform loading/empty/error/disabled UX.
 */
import { memo, type ReactNode } from "react";
import type { CardContract, CardStatus } from "./card-contract";
import { Loader2, AlertCircle, Ban, Inbox } from "lucide-react";

interface CardShellProps<T> {
  contract: CardContract<T>;
  /** Render when status === "live" */
  children: (data: T) => ReactNode;
  /** Optional custom loading renderer */
  loadingSlot?: ReactNode;
  /** Optional custom empty renderer */
  emptySlot?: ReactNode;
  /** Optional className for outer wrapper */
  className?: string;
}

const STATUS_RENDERERS: Record<Exclude<CardStatus, "live">, (contract: CardContract<any>) => ReactNode> = {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
  empty: (c) => (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Inbox className="h-6 w-6 mb-2 opacity-50" />
      <p className="text-xs font-medium">No {c.title.toLowerCase()} yet</p>
    </div>
  ),
  error: (c) => (
    <div className="flex flex-col items-center justify-center py-8 text-destructive">
      <AlertCircle className="h-6 w-6 mb-2 opacity-70" />
      <p className="text-xs font-medium">{c.errorMessage || "Something went wrong"}</p>
    </div>
  ),
  disabled: (c) => (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-50">
      <Ban className="h-6 w-6 mb-2" />
      <p className="text-xs font-medium">{c.disabledReason || "Disabled"}</p>
    </div>
  ),
};

function CardShellInner<T>({ contract, children, loadingSlot, emptySlot, className }: CardShellProps<T>) {
  if (contract.status === "live" && contract.data !== null) {
    return <div className={className}>{children(contract.data as T)}</div>;
  }

  if (contract.status === "loading" && loadingSlot) {
    return <div className={className}>{loadingSlot}</div>;
  }

  if (contract.status === "empty" && emptySlot) {
    return <div className={className}>{emptySlot}</div>;
  }

  const renderer = STATUS_RENDERERS[contract.status as Exclude<CardStatus, "live">];
  if (renderer) {
    return <div className={className}>{renderer(contract)}</div>;
  }

  return null;
}

export const CardShell = memo(CardShellInner) as typeof CardShellInner;
