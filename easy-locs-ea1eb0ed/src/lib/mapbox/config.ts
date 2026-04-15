export const MAPBOX_ACCESS_TOKEN: string =
  import.meta.env.VITE_MAPBOX_TOKEN ?? "";

export function hasMapboxToken(): boolean {
  return MAPBOX_ACCESS_TOKEN.length > 0;
}

export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext;
  } catch {
    return false;
  }
}

export function getMapboxTokenError(): string | null {
  if (!MAPBOX_ACCESS_TOKEN) {
    return "Mapbox token not configured. Set VITE_MAPBOX_TOKEN in your .env file.";
  }
  if (typeof document !== "undefined" && !isWebGLSupported()) {
    return "WebGL is not supported by your browser. Mapbox maps require WebGL.";
  }
  return null;
}
