import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  featureName: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[FeatureErrorBoundary:${this.props.featureName}]`, error.message, info.componentStack);
    void import("@/lib/analytics/sentry")
      .then(({ captureException }) => captureException(error, { componentStack: info.componentStack }))
      .catch(() => {});
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center"
        style={{ minHeight: 300 }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "hsl(38 65% 56% / 0.1)" }}
        >
          <AlertTriangle className="w-7 h-7" style={{ color: "hsl(38 65% 56%)" }} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground mb-1">
            {this.props.featureName} encountered an issue
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.96]"
          style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}
