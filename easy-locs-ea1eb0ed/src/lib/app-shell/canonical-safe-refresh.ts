export async function safeRefresh<T>(fn: () => Promise<T> | T): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error("[safeRefresh] failed:", error);
    return null;
  }
}
