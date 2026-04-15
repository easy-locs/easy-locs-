import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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
