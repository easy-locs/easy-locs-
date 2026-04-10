import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Error:", error.message, error.stack);
    console.error("[ErrorBoundary] Component Stack:", info.componentStack);

    void import("@/lib/ai-audit/triggers")
      .then(({ reportUIRegression }) => {
        reportUIRegression(
          info.componentStack?.split("\n")[1]?.trim() || "Unknown component",
          error.message,
        );
      })
      .catch(() => {});
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={this.handleReset}
              style={{ background: "#D4A853", color: "#0F1117", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              ↻ Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

