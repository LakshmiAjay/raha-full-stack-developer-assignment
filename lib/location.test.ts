import { describe, expect, it } from "vitest";
import { localDateInZone } from "./location";

describe("localDateInZone", () => {
  it("uses the associate timezone across a UTC date boundary", () => {
    const instant = new Date("2026-08-01T20:00:00.000Z");

    expect(localDateInZone(instant, "Asia/Kolkata")).toBe("2026-08-02");
    expect(localDateInZone(instant, "America/Los_Angeles")).toBe("2026-08-01");
  });
});
