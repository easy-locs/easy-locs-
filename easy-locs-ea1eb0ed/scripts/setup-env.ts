const meta = import.meta as Record<string, unknown>;
if (typeof meta.env === "undefined") {
  meta.env = { DEV: false, PROD: true, MODE: "production" };
}
