import { describe, expect, it } from "vitest";
import {
  dayRoutePoints,
  haversineKm,
  routeDistance,
  straightLineDistanceMeters,
  withLiveDistance,
} from "./distance";
const p = (latitude: number, longitude: number, capturedAt = new Date()) => ({
  latitude,
  longitude,
  accuracy: 5,
  capturedAt,
});
describe("distance", () => {
  it("returns zero for identical points", () =>
    expect(haversineKm(p(17, 78), p(17, 78))).toBe(0));
  it("calculates a known great-circle distance", () =>
    expect(haversineKm(p(0, 0), p(0, 1))).toBeCloseTo(111.19, 1));
  it("reports the straight-line lead location difference in metres", () => {
    expect(straightLineDistanceMeters(p(17, 78), p(17, 78))).toBe(0);
    expect(straightLineDistanceMeters(p(0, 0), p(0, 0.001))).toBeCloseTo(
      111,
      0,
    );
  });
  it("orders can be handled by caller without insertion assumptions", async () =>
    expect((await routeDistance([p(1, 1), p(1, 1)])).km).toBe(0));
  it("builds live and final routes in capture order", () => {
    const start = p(1, 1, new Date("2026-08-01T09:00:00Z")),
      visit = p(2, 2, new Date("2026-08-01T12:00:00Z")),
      end = p(3, 3, new Date("2026-08-01T18:00:00Z")),
      day = { startLocation: start, activities: [{ location: visit }] };

    expect(dayRoutePoints(day)).toEqual([start, visit]);
    expect(dayRoutePoints(day, end)).toEqual([start, visit, end]);
  });
  it("uses route samples instead of connecting only activity stops", () => {
    const start = p(1, 1, new Date("2026-08-01T09:00:00Z")),
      sample = p(1.5, 1.5, new Date("2026-08-01T10:00:00Z")),
      visit = p(2, 2, new Date("2026-08-01T12:00:00Z"));

    expect(
      dayRoutePoints({
        startLocation: start,
        routeSamples: [start, sample, visit],
        activities: [{ location: visit }],
      }),
    ).toEqual([start, sample, visit]);
  });
  it("returns a zero live estimate before the first travel segment", async () => {
    const location = p(1, 1),
      day = {
        status: "active" as const,
        startLocation: location,
        activities: [],
      },
      result = await withLiveDistance(day);

    expect(result.totalDistanceKm).toBe(0);
    expect(result.distanceSource).toContain("Live estimate");
  });
  it("preserves the stored final distance for completed days", async () => {
    const day = {
      status: "completed" as const,
      startLocation: p(1, 1),
      activities: [],
      totalDistanceKm: 12.3,
      distanceSource: "OSRM road route",
    };

    expect(await withLiveDistance(day)).toBe(day);
  });
});
