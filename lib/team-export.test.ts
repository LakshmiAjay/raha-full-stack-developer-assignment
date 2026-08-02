import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { demoTeamExportRows, teamExportPipeline } from "./team-export";

describe("monthly team export", () => {
  it("includes only the authenticated head's direct reports", () => {
    const branchId = "branch-a",
      firstHead = "head-a",
      secondHead = "head-b",
      users = [
        {
          _id: "associate-a",
          name: "Asha",
          email: "asha@example.com",
          role: "associate" as const,
          branchId,
          managerId: firstHead,
        },
        {
          _id: "associate-b",
          name: "Bina",
          email: "bina@example.com",
          role: "associate" as const,
          branchId,
          managerId: secondHead,
        },
      ],
      days = [
        {
          userId: "associate-a",
          status: "completed" as const,
          localDate: "2026-08-02",
          totalDistanceKm: 10.24,
        },
        {
          userId: "associate-b",
          status: "completed" as const,
          localDate: "2026-08-02",
          totalDistanceKm: 99,
        },
      ];

    expect(
      demoTeamExportRows(users, days, firstHead, branchId, "2026-08"),
    ).toEqual([
      {
        name: "Asha",
        email: "asha@example.com",
        daysWorked: 1,
        distanceKm: 10.2,
      },
    ]);
  });

  it("scopes the MongoDB pipeline to manager and branch", () => {
    const managerId = new ObjectId(),
      branchId = new ObjectId(),
      pipeline = teamExportPipeline(managerId, branchId, "2026-08");

    expect(pipeline[0]).toEqual({
      $match: { role: "associate", managerId, branchId },
    });
  });
});
