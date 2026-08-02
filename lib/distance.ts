import type { LocationPoint } from "./types";

type DistanceDay = {
  status: "active" | "completed";
  startLocation: LocationPoint;
  activities: Array<{ location: LocationPoint }>;
  totalDistanceKm?: number;
  distanceSource?: string;
};

export function dayRoutePoints(
  day: Pick<DistanceDay, "startLocation" | "activities">,
  endLocation?: LocationPoint,
) {
  return [
    day.startLocation,
    ...day.activities.map((activity) => activity.location),
    ...(endLocation ? [endLocation] : []),
  ].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
}

export function haversineKm(a: LocationPoint, b: LocationPoint) {
  const r = 6371,
    toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude),
    dLon = toRad(b.longitude - a.longitude);
  const q =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(q));
}
export async function segmentDistanceKm(
  a: LocationPoint,
  b: LocationPoint,
): Promise<{ km: number; source: string }> {
  if (a.latitude === b.latitude && a.longitude === b.longitude)
    return { km: 0, source: "identical-points" };
  const base =
    process.env.ROUTING_BASE_URL || "https://router.project-osrm.org";
  try {
    const url = `${base}/route/v1/driving/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error("routing unavailable");
    const json = (await res.json()) as { routes?: { distance: number }[] };
    if (!json.routes?.[0]) throw new Error("no route");
    return { km: json.routes[0].distance / 1000, source: "OSRM road route" };
  } catch {
    return { km: haversineKm(a, b), source: "Haversine fallback" };
  }
}
export async function routeDistance(points: LocationPoint[]) {
  let km = 0;
  const sources = new Set<string>();
  for (let i = 1; i < points.length; i++) {
    const result = await segmentDistanceKm(points[i - 1], points[i]);
    km += result.km;
    sources.add(result.source);
  }
  return { km: Math.round(km * 10) / 10, source: [...sources].join(" + ") };
}

export async function withLiveDistance<T extends DistanceDay>(day: T) {
  if (day.status !== "active") return day;

  const distance = await routeDistance(dayRoutePoints(day));
  return {
    ...day,
    totalDistanceKm: distance.km,
    distanceSource: distance.source
      ? `Live estimate · ${distance.source}`
      : "Live estimate · no travel segments yet",
  };
}
