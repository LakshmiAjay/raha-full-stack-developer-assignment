import { describe, expect, it } from "vitest";
import { haversineKm, routeDistance } from "./distance";
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
  it("orders can be handled by caller without insertion assumptions", async () =>
    expect((await routeDistance([p(1, 1), p(1, 1)])).km).toBe(0));
});
