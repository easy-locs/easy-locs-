import React, { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { structuredLogger } from "@/lib/observability/structured-logger";
import type { LogDomain } from "@/lib/observability/structured-logger";
import { createIncident } from "@/lib/control-plane/incident-engine";
import type { ControlDomain } from "@/lib/control-plane/types";

interface DomainErrorBoundaryProps {
  domain: ControlDomain;
  logDomain: LogDomain;
  pillar: string;
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, domain: ControlDomain) => void;
}

interface DomainErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DomainErrorBoundary extends Component<DomainErrorBoundaryProps, DomainErrorBoundaryState> {
  constructor(props: DomainErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DomainErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { domain, logDomain, pillar, onError } = this.props;

    structuredLogger.critical(logDomain, "boundary.crash", `${pillar} crashed: ${error.message}`, {
      error_code: "DOMAIN_BOUNDARY_CRASH",
      error_classification: "fatal",
      payload_summary: {
        component_stack: errorInfo.componentStack?.slice(0, 500),
        domain,
        pillar,
      },
    });

    Sentry.captureException(error, {
      tags: { domain, pillar, boundary: "domain" },
      contexts: {
        domain_boundary: {
          domain,
          pillar,
          component_stack: errorInfo.componentStack?.slice(0, 1000),
        },
      },
    });

    createIncident({
      domain,
      title: `${pillar} Crash: ${error.message.slice(0, 100)}`,
      description: `The ${pillar} pillar crashed with: ${error.message}`,
      error_code: "DOMAIN_BOUNDARY_CRASH",
      auto_mitigated: true,
    });

    onError?.(error, domain);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "hsl(225 22% 16% / 0.1)" }}
          >
            <span className="text-2xl">⚠️</span>
          </div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "hsl(225 22% 16%)" }}
          >
            {this.props.pillar} encountered an issue
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Something went wrong in this section. Our team has been notified and is looking into it.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "hsl(var(--accent))" }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DashboardBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="dashboard" logDomain="dashboard" pillar="Dashboard">
      {children}
    </DomainErrorBoundary>
  );
}

export function OrbitBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="orbit" logDomain="orbit" pillar="Orbit">
      {children}
    </DomainErrorBoundary>
  );
}

export function WalletBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="wallet" logDomain="wallet" pillar="Wallet">
      {children}
    </DomainErrorBoundary>
  );
}

export function RadarBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="radar" logDomain="radar" pillar="Radar">
      {children}
    </DomainErrorBoundary>
  );
}

export function MarketplaceBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="marketplace" logDomain="marketplace" pillar="Marketplace">
      {children}
    </DomainErrorBoundary>
  );
}

export function BookingBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="booking" logDomain="booking" pillar="Booking">
      {children}
    </DomainErrorBoundary>
  );
}

export function PropertyBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="property" logDomain="property" pillar="Property">
      {children}
    </DomainErrorBoundary>
  );
}

export function ProviderBoundary({ children }: { children: ReactNode }) {
  return (
    <DomainErrorBoundary domain="listing" logDomain="marketplace" pillar="Provider">
      {children}
    </DomainErrorBoundary>
  );
}
