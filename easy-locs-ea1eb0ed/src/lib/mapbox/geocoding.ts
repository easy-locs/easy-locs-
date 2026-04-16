export async function forwardGeocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "EasyLocs/1.0" },
  });
  if (!res.ok) throw new Error("Geocoding failed");
  const results = await res.json();

  return {
    features: results.map((r: any) => ({
      place_name: r.display_name,
      text: r.name || r.display_name?.split(",")[0] || "",
      center: [parseFloat(r.lon), parseFloat(r.lat)],
      geometry: { type: "Point", coordinates: [parseFloat(r.lon), parseFloat(r.lat)] },
      context: [],
      properties: { address: r.address },
    })),
  };
}

export async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "EasyLocs/1.0" },
  });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const result = await res.json();

  return {
    features: [{
      place_name: result.display_name,
      text: result.name || result.display_name?.split(",")[0] || "",
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      geometry: { type: "Point", coordinates: [parseFloat(result.lon), parseFloat(result.lat)] },
      context: [],
      properties: { address: result.address },
    }],
  };
}
