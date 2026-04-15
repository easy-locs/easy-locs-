import { Component, type ReactNode } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { trackMapErrorBoundary } from "@/lib/analytics/map-error-analytics";

interface Props {
  children: ReactNode;
  fallbackHeight?: number | string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Unknown map error" };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[MapErrorBoundary]", error);
    trackMapErrorBoundary(errorInfo?.componentStack ?? undefined, error.message || "Unknown map error");
  }

  handleRetry() {
    this.setState({ hasError: false, errorMessage: "" });
  }

  render() {
    if (this.state.hasError) {
      const height = this.props.fallbackHeight ?? 300;
      return (
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            height: typeof height === "number" ? `${height}px` : height,
            width: "100%",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border) / 0.2)",
          }}
        >
          <div className="text-center px-6">
            <MapPin
              className="h-8 w-8 mx-auto mb-3"
              style={{ color: "hsl(var(--muted-foreground))" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Map unavailable
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}
            >
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
                border: "1px solid hsl(var(--primary) / 0.2)",
              }}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
