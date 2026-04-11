if (typeof window !== "undefined" && !("requestIdleCallback" in window)) {
  (window as any).requestIdleCallback = (
    cb: (deadline: IdleDeadline) => void,
    opts?: { timeout?: number },
  ) => {
    const start = Date.now();
    const timeoutMs = opts?.timeout ?? 50;
    return window.setTimeout(() => {
      const elapsed = Date.now() - start;
      const timedOut = elapsed >= timeoutMs;
      cb({
        didTimeout: timedOut,
        timeRemaining: () => (timedOut ? 0 : Math.max(0, 50 - (Date.now() - start))),
      } as IdleDeadline);
    }, 1);
  };
  (window as any).cancelIdleCallback = (id: number) => window.clearTimeout(id);
}
