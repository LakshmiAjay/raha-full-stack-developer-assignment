import { describe, expect, it } from "vitest";
import { localDateInZone, shouldRecordRouteSample } from "./location";

const point = (capturedAt: string) => ({
  latitude: 17.4,
  longitude: 78.4,
  accuracy: 20,
  capturedAt: new Date(capturedAt),
});

describe("localDateInZone", () => {
  it("uses the associate timezone across a UTC date boundary", () => {
    const instant = new Date("2026-08-01T20:00:00.000Z");

    expect(localDateInZone(instant, "Asia/Kolkata")).toBe("2026-08-02");
    expect(localDateInZone(instant, "America/Los_Angeles")).toBe("2026-08-01");
  });
  it("accepts route samples at roughly two-minute intervals", () => {
    const samples = [point("2026-08-02T09:00:00.000Z")];

    expect(
      shouldRecordRouteSample(
        samples,
        new Date("2026-08-02T09:01:00.000Z"),
      ),
    ).toBe(false);
    expect(
      shouldRecordRouteSample(
        samples,
        new Date("2026-08-02T09:02:00.000Z"),
      ),
    ).toBe(true);
  });
});
