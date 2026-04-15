import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MapErrorBoundary } from "./MapErrorBoundary";
import { trackMapErrorBoundary } from "@/lib/analytics/map-error-analytics";

vi.mock("@/lib/analytics/map-error-analytics", () => ({
  trackMapErrorBoundary: vi.fn(),
}));

const trackMapErrorBoundaryMock = vi.mocked(trackMapErrorBoundary);

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Simulated map crash");
  return <div data-testid="child-content">Map loaded</div>;
}

describe("MapErrorBoundary", () => {
  const originalConsoleWarn = console.warn;
  beforeEach(() => {
    console.warn = vi.fn();
    trackMapErrorBoundaryMock.mockClear();
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

  it("shows a retry button that resets the boundary and re-renders children", async () => {
    const user = userEvent.setup();
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
    await user.click(retryButton);

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

  it("calls trackMapErrorBoundary with error message and component stack when a child throws", () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    expect(trackMapErrorBoundaryMock).toHaveBeenCalledTimes(1);

    const [componentStack, errorMessage] = trackMapErrorBoundaryMock.mock.calls[0];
    expect(errorMessage).toBe("Simulated map crash");
    expect(typeof componentStack).toBe("string");
    expect(componentStack!.length).toBeGreaterThan(0);
  });

  it("passes 'Unknown map error' when error.message is empty", () => {
    function ThrowEmpty() {
      throw new Error("");
    }

    render(
      <MapErrorBoundary>
        <ThrowEmpty />
      </MapErrorBoundary>,
    );

    expect(trackMapErrorBoundaryMock).toHaveBeenCalledTimes(1);
    expect(trackMapErrorBoundaryMock.mock.calls[0][1]).toBe("Unknown map error");
  });

  it("does not call trackMapErrorBoundary when children render successfully", () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </MapErrorBoundary>,
    );

    expect(trackMapErrorBoundaryMock).not.toHaveBeenCalled();
  });

  it("calls trackMapErrorBoundary exactly once per crash", () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>,
    );

    expect(trackMapErrorBoundaryMock).toHaveBeenCalledTimes(1);
  });
});
