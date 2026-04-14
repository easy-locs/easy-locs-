import { useEffect } from "react";
import { startDevOSRuntime, stopDevOSRuntime } from "@/devos/runtime/devos-runtime";

export function DevOSBoot() {
  useEffect(() => {
    startDevOSRuntime();
    return () => {
      stopDevOSRuntime();
    };
  }, []);

  return null;
}

export default DevOSBoot;
