import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  featureName: string;
  domain?: string;
  onReset?: () => void;
  maxAutoRetries?: number;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

const AUTO_RETRY_DELAY = 800;
const DEFAULT_MAX_RETRIES = 2;

export class FeatureErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    if (error instanceof Error) return { hasError: true, error };
    const msg = typeof error === "string" ? error : "An unexpected error occurred";
    return { hasError: true, error: new Error(msg) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[FeatureErrorBoundary:${this.props.featureName}]`, error.message, info.componentStack);

    void import("@/lib/analytics/sentry").then(({ captureException: sentryCapture, Sentry }) => {
      Sentry.withScope((scope: any) => {
        scope.setTag("feature", this.props.featureName);
        if (this.props.domain) scope.setTag("domain", this.props.domain);
        scope.setTag("errorBoundary", "feature");
        scope.setExtra("componentStack", info.componentStack || "");
        scope.setExtra("retryCount", this.state.retryCount);
        sentryCapture(error);
      });
    }).catch(() => {});

    void import("@/lib/observability/structured-logger").then(({ structuredLogger }) => {
      const domain = (this.props.domain || this.props.featureName.toLowerCase()) as any;
      structuredLogger.error(domain, "error_boundary.caught", `Error boundary caught: ${error.message}`, {
        feature: this.props.featureName,
        retry_count: this.state.retryCount,
        component_stack: info.componentStack?.slice(0, 500),
      });
    }).catch(() => {});

    void import("@/lib/control-plane/domain-health").then(({ recordAction }) => {
      const domain = (this.props.domain || this.props.featureName.toLowerCase()) as any;
      recordAction(domain, "render", false);
    }).catch(() => {});

    void import("@/lib/auto-heal")
      .then(({ healError }) => healError(error))
      .catch(() => {});

    void import("@/lib/auto-protect")
      .then(({ protectCard }) => {
        protectCard(
          "error-boundary",
          this.props.featureName,
          error.message,
          { domain: this.props.domain, retryCount: this.state.retryCount },
        );
      })
      .catch(() => {});

    const maxRetries = this.props.maxAutoRetries ?? DEFAULT_MAX_RETRIES;
    if (this.state.retryCount < maxRetries) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: undefined,
          retryCount: prev.retryCount + 1,
        }));
      }, AUTO_RETRY_DELAY * (this.state.retryCount + 1));
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, retryCount: 0 });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const maxRetries = this.props.maxAutoRetries ?? DEFAULT_MAX_RETRIES;
    if (this.state.retryCount < maxRetries) {
      return (
        <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--accent))", borderTopColor: "transparent" }} />
        </div>
      );
    }

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center"
        style={{ minHeight: 300 }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "hsl(var(--accent) / 0.1)" }}
        >
          <AlertTriangle className="w-7 h-7" style={{ color: "hsl(var(--accent))" }} />
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
          style={{ background: "hsl(var(--accent))", color: "hsl(225 22% 16%)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}
