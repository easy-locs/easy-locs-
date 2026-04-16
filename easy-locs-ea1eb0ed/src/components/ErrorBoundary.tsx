import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

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

    void import("@/lib/analytics/sentry")
      .then(({ captureException }) => {
        captureException(error, { componentStack: info.componentStack });
      })
      .catch(() => {});

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
        <div className="min-h-[400px] flex items-center justify-center p-8 font-sans">
          <div className="text-center max-w-[400px]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-destructive/10 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
            <p className="text-[0.8125rem] text-muted-foreground mb-6">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-[0.96]"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
