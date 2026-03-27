import React, { ButtonHTMLAttributes } from "react";
import { runGuardedAction } from "@/lib/runtime/action-guard";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  actionKey: string;
  componentKey: string;
  flowKey: string;
  onGuardedClick: () => Promise<void>;
  timeoutMs?: number;
  slowMs?: number;
}

export default function ActionGuardButton({
  actionKey,
  componentKey,
  flowKey,
  onGuardedClick,
  timeoutMs,
  slowMs,
  children,
  ...rest
}: Props) {
  const { user } = useAuth();
  const location = useLocation();

  const routeKey =
    location.pathname.startsWith("/orbit")
      ? "orbit"
      : location.pathname.startsWith("/travel")
        ? "travel"
        : location.pathname.startsWith("/marketplace")
          ? "marketplace"
          : "app";

  return (
    <button
      {...rest}
      onClick={async () => {
        try {
          await runGuardedAction(onGuardedClick, {
            userId: user?.id ?? null,
            routeKey,
            componentKey,
            flowKey,
            actionKey,
            timeoutMs,
            slowMs,
          });
        } catch (err) {
          console.error(`[ActionGuard] ${actionKey} failed`, err);
        }
      }}
    >
      {children}
    </button>
  );
}
