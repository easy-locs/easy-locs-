import React, { PropsWithChildren } from "react";

export function BrowserTelemetryInit() {
  return null;
}

export default function BrowserTelemetryProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
