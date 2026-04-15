import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { axe } from "vitest-axe";
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

    const retryButton = screen.getByRole("button", { name: /Retry map load, attempt 1 of 5/ });
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
      screen.getByRole("button", { name: /Retry map load, attempt 2 of 5/ }),
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
      name: /Retry in 8 seconds/,
    });
    expect(retryButton.disabled).toBe(true);
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

    const retryButton = screen.getByRole("button", { name: /Retry map load, attempt 1 of 5/ });
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

    const retryButton = screen.getByRole("button", { name: /Retry in 5 seconds/ });
    await user.click(retryButton);

    expect(handleRetry).not.toHaveBeenCalled();
  });
});

describe("MapErrorFallback accessibility", () => {
  it("has alert role scoped to the message region only", () => {
    render(<MapErrorFallback message="Token expired" onRetry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(within(alert).getByText("Map unavailable")).toBeInTheDocument();
    expect(within(alert).getByText("Token expired")).toBeInTheDocument();
  });

  it("alert region does not contain interactive controls", () => {
    render(
      <MapErrorFallback
        message="Token expired"
        onRetry={() => {}}
        retryCount={1}
        maxRetries={5}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).queryByRole("button")).not.toBeInTheDocument();
  });

  it("displays the error title as visible text", () => {
    render(<MapErrorFallback message="Token expired" />);
    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
  });

  it("displays the error message", () => {
    render(<MapErrorFallback message="Token expired" />);
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });

  it("shows exhausted message when retries are used up", () => {
    render(<MapErrorFallback exhausted message="Token expired" />);
    expect(screen.getByText("Please try again later")).toBeInTheDocument();
    expect(screen.queryByText("Token expired")).not.toBeInTheDocument();
  });

  it("retry button has descriptive aria-label", () => {
    render(
      <MapErrorFallback
        message="Token expired"
        onRetry={() => {}}
        retryCount={2}
        maxRetries={5}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Retry map load, attempt 2 of 5",
    );
  });

  it("cooldown button has aria-disabled and descriptive aria-label", () => {
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
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-label", "Retry in 8 seconds");
  });

  it("retry button is not aria-disabled when not on cooldown", () => {
    render(
      <MapErrorFallback
        message="Token expired"
        onRetry={() => {}}
        retryCount={1}
        maxRetries={5}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "false");
  });

  it("does not render retry button when exhausted", () => {
    render(
      <MapErrorFallback
        exhausted
        message="Token expired"
        onRetry={() => {}}
        retryCount={5}
        maxRetries={5}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offline status message has role=status with polite aria-live", () => {
    render(
      <MapErrorFallback
        isOffline
        message="Network error"
        onRetry={() => {}}
        retryCount={2}
        maxRetries={5}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(
      "No internet — will retry automatically when reconnected",
    );
  });

  it("offline status is outside the alert region", () => {
    render(
      <MapErrorFallback
        isOffline
        message="Network error"
        onRetry={() => {}}
        retryCount={2}
        maxRetries={5}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).queryByRole("status")).not.toBeInTheDocument();
  });

  it("all decorative icons are hidden from assistive technology", () => {
    const { container } = render(
      <MapErrorFallback
        isOffline
        message="Network error"
        locationLabel="New Orleans, LA"
        onRetry={() => {}}
        retryCount={0}
        maxRetries={5}
      />,
    );
    const allSvgs = container.querySelectorAll("svg");
    const hiddenSvgs = container.querySelectorAll("svg[aria-hidden='true']");
    expect(allSvgs.length).toBeGreaterThan(0);
    expect(hiddenSvgs.length).toBe(allSvgs.length);
  });

  it("passes automated axe accessibility checks (default state)", async () => {
    const { container } = render(
      <MapErrorFallback message="Token expired" onRetry={() => {}} />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("passes automated axe accessibility checks (cooldown state)", async () => {
    const { container } = render(
      <MapErrorFallback
        message="Rate limited"
        isOnCooldown
        cooldownRemaining={5}
        onRetry={() => {}}
        retryCount={2}
        maxRetries={5}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("passes automated axe accessibility checks (offline state)", async () => {
    const { container } = render(
      <MapErrorFallback
        isOffline
        message="Network error"
        onRetry={() => {}}
        retryCount={1}
        maxRetries={5}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("passes automated axe accessibility checks (exhausted state)", async () => {
    const { container } = render(
      <MapErrorFallback
        exhausted
        message="Token expired"
        retryCount={5}
        maxRetries={5}
        onRetry={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
