export function computeLiveETASimple(driver: any, destination: any) {
  if (!driver || !destination) return null;

  const dx = driver.lat - destination.lat;
  const dy = driver.lng - destination.lng;
  const distanceKm = Math.sqrt(dx * dx + dy * dy) * 111;
  const eta = Math.max(2, Math.round(distanceKm * 2));

  return {
    distanceKm,
    etaMinutes: eta,
  };
}
