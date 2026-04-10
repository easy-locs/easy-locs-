export function safeErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

export function serializeForDebug(data: unknown) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return String(data);
  }
}
