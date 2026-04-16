import { useEffect } from "react";
import { statusBarController, type StatusBarTheme } from "@/lib/platform/status-bar-controller";

export function useStatusBar(options: {
  immersive?: boolean;
  theme?: StatusBarTheme;
  color?: string;
}) {
  useEffect(() => {
    statusBarController.setForPage(options);

    return () => {
      statusBarController.setForPage({ theme: "auto" });
    };
  }, [options.immersive, options.theme, options.color]);
}

export function useImmersiveStatusBar() {
  useStatusBar({ immersive: true });
}
