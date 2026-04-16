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

export function getMapTokenError(): string | null {
  if (typeof document !== "undefined" && !isWebGLSupported()) {
    return "WebGL is not supported by your browser. Maps require WebGL.";
  }
  return null;
}

export const getMapboxTokenError = getMapTokenError;
export const MAPBOX_ACCESS_TOKEN = "";

export function hasMapboxToken(): boolean {
  return true;
}
