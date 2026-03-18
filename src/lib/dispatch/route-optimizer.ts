/**
 * Nearest-neighbor route optimizer for multi-stop delivery.
 * Greedy heuristic: always pick the closest unvisited point next.
 */
export function optimizeRoute(points: { lat: number; lng: number }[]) {
  if (points.length <= 1) return [...points];

  const route = [points[0]];
  const remaining = points.slice(1);

  while (remaining.length) {
    const last = route[route.length - 1];
    let nearestIndex = 0;
    let nearestDist = Infinity;

    remaining.forEach((p, i) => {
      const dist = Math.hypot(p.lat - last.lat, p.lng - last.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    });

    route.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return route;
}

/** Estimate total distance of an ordered route (in approx degrees). */
export function routeDistance(points: { lat: number; lng: number }[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].lat - points[i - 1].lat,
      points[i].lng - points[i - 1].lng
    );
  }
  return total;
}
