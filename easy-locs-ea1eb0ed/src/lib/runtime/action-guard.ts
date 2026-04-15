export interface GuardedActionOptions {
  userId?: string | null;
  orgId?: string | null;
  routeKey?: string | null;
  componentKey?: string | null;
  flowKey?: string | null;
  actionKey: string;
  timeoutMs?: number;
  slowMs?: number;
  deadClickTitle?: string;
}

export async function runGuardedAction<T>(
  fn: () => Promise<T>,
  options: GuardedActionOptions,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 12000;

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Action timeout: ${options.actionKey}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result as T;
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw err;
  }
}
