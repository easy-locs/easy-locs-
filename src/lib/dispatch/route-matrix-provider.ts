export type MatrixPoint = { lat: number; lng: number };

export async function computeProviderRouteMatrix(params: {
  provider: "mock" | "google" | "mapbox";
  points: MatrixPoint[];
}) {
  if (params.provider === "mock") {
    const matrix = params.points.map((from, i) =>
      params.points.map((to, j) => {
        if (i === j) return 0;
        return Number(Math.hypot(from.lat - to.lat, from.lng - to.lng).toFixed(6));
      })
    );
    return { matrix };
  }

  // Google / Mapbox: call backend edge function proxy
  return { matrix: [] };
}
