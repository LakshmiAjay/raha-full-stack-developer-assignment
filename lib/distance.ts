import type { LocationPoint, RouteCoordinate } from "./types";

type Coordinates = Pick<LocationPoint, "latitude" | "longitude">;

type DistanceDay = {
  status: "active" | "completed";
  startLocation: LocationPoint;
  routeSamples?: LocationPoint[];
  activities: Array<{ location: LocationPoint }>;
  totalDistanceKm?: number;
  distanceSource?: string;
};

export function dayRoutePoints(
  day: Pick<DistanceDay, "startLocation" | "activities" | "routeSamples">,
  endLocation?: LocationPoint,
) {
  const recorded = day.routeSamples?.length
    ? day.routeSamples
    : [day.startLocation, ...day.activities.map((activity) => activity.location)];
  return [...recorded, ...(endLocation ? [endLocation] : [])].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
}

export function haversineKm(a: Coordinates, b: Coordinates) {
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
export function straightLineDistanceMeters(a: Coordinates, b: Coordinates) {
  return Math.round(haversineKm(a, b) * 1000);
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
  const route = await routeDetails(points);
  return { km: route.km, source: route.source };
}

export async function routeDetails(points: LocationPoint[]): Promise<{
  km: number;
  source: string;
  path: RouteCoordinate[];
}> {
  if (points.length < 2)
    return {
      km: 0,
      source: "",
      path: points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    };
  if (
    points.every(
      (point) =>
        point.latitude === points[0].latitude &&
        point.longitude === points[0].longitude,
    )
  )
    return {
      km: 0,
      source: "identical-points",
      path: [{ latitude: points[0].latitude, longitude: points[0].longitude }],
    };

  let km = 0;
  const sources = new Set<string>(),
    path: RouteCoordinate[] = [],
    base = process.env.ROUTING_BASE_URL || "https://router.project-osrm.org";
  for (let start = 0; start < points.length - 1; start += 89) {
    const chunk = points.slice(start, start + 90),
      coordinates = chunk
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(";");
    try {
      const url = `${base}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
        response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("routing unavailable");
      const json = (await response.json()) as {
        routes?: {
          distance: number;
          geometry: { coordinates: [number, number][] };
        }[];
      };
      const route = json.routes?.[0];
      if (!route) throw new Error("no route");
      km += route.distance / 1000;
      const routePath = route.geometry.coordinates.map(
        ([longitude, latitude]) => ({ latitude, longitude }),
      );
      path.push(...(path.length ? routePath.slice(1) : routePath));
      sources.add("OSRM road route");
    } catch {
      for (let index = 1; index < chunk.length; index++)
        km += haversineKm(chunk[index - 1], chunk[index]);
      const fallbackPath = chunk.map(({ latitude, longitude }) => ({
        latitude,
        longitude,
      }));
      path.push(...(path.length ? fallbackPath.slice(1) : fallbackPath));
      sources.add("Haversine fallback");
    }
  }
  return {
    km: Math.round(km * 10) / 10,
    source: [...sources].join(" + "),
    path,
  };
}

export async function withLiveDistance<T extends DistanceDay>(day: T) {
  if (day.status !== "active") return day;

  const distance = await routeDetails(dayRoutePoints(day));
  return {
    ...day,
    totalDistanceKm: distance.km,
    routePath: distance.path,
    distanceSource: distance.source
      ? `Live estimate · ${distance.source}`
      : "Live estimate · no travel segments yet",
  };
}
