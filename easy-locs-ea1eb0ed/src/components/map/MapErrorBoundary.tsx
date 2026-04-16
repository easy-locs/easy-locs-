import { Component, type ReactNode } from "react";
import { trackMapErrorBoundary } from "@/lib/analytics/map-error-analytics";
import MapErrorFallback from "./MapErrorFallback";
import type { LucideIcon } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackHeight?: number | string;
  fallbackTitle?: string;
  fallbackIcon?: LucideIcon;
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
          role="region"
          aria-label={this.props.fallbackTitle || "Map error recovery"}
        >
          <MapErrorFallback
            message={this.state.errorMessage}
            title={this.props.fallbackTitle}
            icon={this.props.fallbackIcon}
            onRetry={this.handleRetry}
            style={{
              height: typeof height === "number" ? `${height}px` : height,
              width: "100%",
              minHeight: "unset",
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
