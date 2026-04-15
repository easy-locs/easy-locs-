import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MapErrorBoundary } from "./MapErrorBoundary";

vi.mock("@/lib/analytics/map-error-analytics", () => ({
  trackMapErrorBoundary: vi.fn(),
}));

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Simulated map crash");
  return <div data-testid="child-content">Map loaded</div>;
}

describe("MapErrorBoundary", () => {
  const originalConsoleWarn = console.warn;
  beforeEach(() => {
    console.warn = vi.fn();
  });
  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  it("renders children when there is no error", () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </MapErrorBoundary>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Map loaded")).toBeInTheDocument();
  });

  it("renders MapErrorFallback with error message when child throws", () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    expect(screen.getByText("Simulated map crash")).toBeInTheDocument();
  });

  it("shows a retry button that resets the boundary and re-renders children", () => {
    let shouldThrow = true;

    function ToggleChild() {
      if (shouldThrow) throw new Error("Crash once");
      return <div data-testid="child-content">Map loaded</div>;
    }

    render(
      <MapErrorBoundary>
        <ToggleChild />
      </MapErrorBoundary>,
    );

    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    expect(screen.getByText("Crash once")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(retryButton);

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Map loaded")).toBeInTheDocument();
    expect(screen.queryByText("Map unavailable")).not.toBeInTheDocument();
  });

  it("applies fallbackHeight as inline style on the fallback", () => {
    const { container } = render(
      <MapErrorBoundary fallbackHeight={500}>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    const fallbackRoot = container.firstChild as HTMLElement;
    expect(fallbackRoot.style.height).toBe("500px");
    expect(fallbackRoot.style.width).toBe("100%");
  });

  it("accepts string fallbackHeight", () => {
    const { container } = render(
      <MapErrorBoundary fallbackHeight="50vh">
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    const fallbackRoot = container.firstChild as HTMLElement;
    expect(fallbackRoot.style.height).toBe("50vh");
  });

  it("defaults to 300px height when fallbackHeight is not provided", () => {
    const { container } = render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    const fallbackRoot = container.firstChild as HTMLElement;
    expect(fallbackRoot.style.height).toBe("300px");
  });

  it("produces a snapshot matching the MapErrorFallback markup", () => {
    const { container } = render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
