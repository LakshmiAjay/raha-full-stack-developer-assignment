import { describe, expect, it } from "vitest";
import {
  breakSummary,
  breakUsageMinutes,
  effectiveActiveBreak,
} from "./breaks";

const at = (value: string) => new Date(`2026-08-03T${value}:00.000Z`);

describe("break allowance", () => {
  it("counts completed and active break time", () => {
    const now = at("10:10"),
      days = [
        {
          breaks: [
            {
              startedAt: at("09:00"),
              autoEndsAt: at("09:20"),
              endedAt: at("09:12"),
              durationMinutes: 12,
            },
            {
              startedAt: at("10:00"),
              autoEndsAt: at("10:30"),
            },
          ],
        },
      ];

    expect(breakUsageMinutes(days, now)).toBe(22);
    expect(breakSummary(days, 60, now)).toMatchObject({
      onBreak: true,
      breakUsedMinutesToday: 22,
      breakRemainingMinutesToday: 38,
    });
  });

  it("caps an unattended break at its planned end", () => {
    const day = {
      breaks: [
        {
          startedAt: at("10:00"),
          autoEndsAt: at("10:15"),
        },
      ],
    };

    expect(effectiveActiveBreak(day, at("10:20"))).toBeUndefined();
    expect(breakUsageMinutes([day], at("11:00"))).toBe(15);
  });

  it("adds approved extra time to the displayed allowance", () => {
    const summary = breakSummary([], 75, at("10:00"));
    expect(summary.breakAllowanceMinutesToday).toBe(75);
    expect(summary.breakRemainingMinutesToday).toBe(75);
  });
});
