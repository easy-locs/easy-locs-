import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import MapErrorFallback from "./MapErrorFallback";

describe("MapErrorFallback snapshots", () => {
  it("compact mode", () => {
    const { container } = render(
      <MapErrorFallback
        compact
        message="Token expired"
        onRetry={() => {}}
        retryCount={1}
        maxRetries={5}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("exhausted mode", () => {
    const { container } = render(
      <MapErrorFallback
        exhausted
        message="Token expired"
        retryCount={5}
        maxRetries={5}
        onRetry={() => {}}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("offline mode", () => {
    const { container } = render(
      <MapErrorFallback
        isOffline
        message="Network error"
        onRetry={() => {}}
        retryCount={2}
        maxRetries={5}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("with location coordinates", () => {
    const { container } = render(
      <MapErrorFallback
        message="Map failed to load"
        lat={29.951065}
        lng={-90.071533}
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("with location label", () => {
    const { container } = render(
      <MapErrorFallback
        message="Map failed to load"
        locationLabel="New Orleans, LA"
        lat={29.951065}
        lng={-90.071533}
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("cooldown state", () => {
    const { container } = render(
      <MapErrorFallback
        message="Rate limited"
        isOnCooldown
        cooldownRemaining={8}
        onRetry={() => {}}
        retryCount={3}
        maxRetries={5}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("MapErrorFallback behavioral assertions", () => {
  it("compact mode shows message and retry button with correct count", () => {
    render(
      <MapErrorFallback
        compact
        message="Token expired"
        onRetry={() => {}}
        retryCount={1}
        maxRetries={5}
      />,
    );

    expect(screen.getByText("Map unavailable")).toBeTruthy();
    expect(screen.getByText("Token expired")).toBeTruthy();

    const retryButton = screen.getByRole("button", { name: /Retry \(1\/5\)/ });
    expect(retryButton).toBeTruthy();
    expect(retryButton.disabled).toBe(false);
  });

  it("exhausted mode hides retry button and shows fallback text instead of message", () => {
    render(
      <MapErrorFallback
        exhausted
        message="Token expired"
        retryCount={5}
        maxRetries={5}
        onRetry={() => {}}
      />,
    );

    expect(screen.getByText("Please try again later")).toBeTruthy();
    expect(screen.queryByText("Token expired")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offline mode shows offline banner and retry button", () => {
    render(
      <MapErrorFallback
        isOffline
        message="Network error"
        onRetry={() => {}}
        retryCount={2}
        maxRetries={5}
      />,
    );

    expect(
      screen.getByText(
        /No internet — will retry automatically when reconnected/,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Network error")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Retry \(2\/5\)/ }),
    ).toBeTruthy();
  });

  it("shows coordinates when no locationLabel is provided", () => {
    render(
      <MapErrorFallback
        message="Map failed to load"
        lat={29.951065}
        lng={-90.071533}
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );

    expect(screen.getByText("29.951065, -90.071533")).toBeTruthy();
    expect(screen.getByText("Map failed to load")).toBeTruthy();
  });

  it("shows locationLabel and hides coordinates when both are provided", () => {
    render(
      <MapErrorFallback
        message="Map failed to load"
        locationLabel="New Orleans, LA"
        lat={29.951065}
        lng={-90.071533}
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );

    expect(screen.getByText("New Orleans, LA")).toBeTruthy();
    expect(screen.queryByText("29.951065, -90.071533")).toBeNull();
  });

  it("cooldown state disables button and shows countdown text", () => {
    render(
      <MapErrorFallback
        message="Rate limited"
        isOnCooldown
        cooldownRemaining={8}
        onRetry={() => {}}
        retryCount={3}
        maxRetries={5}
      />,
    );

    const retryButton = screen.getByRole("button", {
      name: /Retry in 8s/,
    });
    expect(retryButton.disabled).toBe(true);
    expect(screen.queryByText(/Retry \(3\/5\)/)).toBeNull();
  });

  it("hides retry button when onRetry is not provided", () => {
    render(
      <MapErrorFallback
        message="Map failed to load"
        retryCount={0}
        maxRetries={5}
      />,
    );

    expect(screen.getByText("Map unavailable")).toBeTruthy();
    expect(screen.getByText("Map failed to load")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("exhausted mode with onRetry still hides the retry button", () => {
    const handleRetry = vi.fn();
    render(
      <MapErrorFallback
        exhausted
        message="Token expired"
        onRetry={handleRetry}
        retryCount={5}
        maxRetries={5}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Please try again later")).toBeTruthy();
    expect(screen.queryByText("Token expired")).toBeNull();
  });

  it("does not show coordinates when neither lat nor lng is provided", () => {
    render(
      <MapErrorFallback
        message="Map failed to load"
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );

    expect(screen.getByText("Map unavailable")).toBeTruthy();
    expect(screen.queryByText(/\d+\.\d+,/)).toBeNull();
  });

  it("does not show coordinates when only lat is provided", () => {
    render(
      <MapErrorFallback
        message="Map failed to load"
        lat={29.951065}
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );

    expect(screen.queryByText(/29\.951065/)).toBeNull();
  });

  it("does not show coordinates when only lng is provided", () => {
    render(
      <MapErrorFallback
        message="Map failed to load"
        lng={-90.071533}
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );

    expect(screen.queryByText(/-90\.071533/)).toBeNull();
  });

  it("clicking retry button calls onRetry", async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <MapErrorFallback
        message="Map failed to load"
        onRetry={handleRetry}
        retryCount={1}
        maxRetries={5}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /Retry \(1\/5\)/ });
    await user.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("clicking disabled cooldown button does not call onRetry", async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <MapErrorFallback
        message="Rate limited"
        isOnCooldown
        cooldownRemaining={5}
        onRetry={handleRetry}
        retryCount={2}
        maxRetries={5}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /Retry in 5s/ });
    await user.click(retryButton);

    expect(handleRetry).not.toHaveBeenCalled();
  });
});
