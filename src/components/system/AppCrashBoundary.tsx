import React from "react";
import { emitRuntimeError } from "@/lib/shared/runtime-error-hub";

type State = { hasError: boolean };

export class AppCrashBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    emitRuntimeError({
      scope: "react",
      code: "crash_boundary",
      message: error?.message || "React crash",
      details: { raw: String(error) },
      createdAt: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4 p-6">
            <p className="text-lg font-semibold text-foreground">App crashed</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-6 py-2 text-sm text-primary-foreground"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
