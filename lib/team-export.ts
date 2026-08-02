import type { Document, ObjectId } from "mongodb";

type ExportUser<Id> = {
  _id: Id;
  name: string;
  email: string;
  role: "associate" | "head";
  branchId: Id;
  managerId?: Id;
};

type ExportDay<Id> = {
  userId: Id;
  status: "active" | "completed";
  localDate: string;
  totalDistanceKm?: number;
};

export type TeamExportRow = {
  name: string;
  email: string;
  daysWorked: number;
  distanceKm: number;
};

const sameId = (left: unknown, right: unknown) =>
  String(left) === String(right);

export function demoTeamExportRows<Id>(
  users: ExportUser<Id>[],
  days: ExportDay<Id>[],
  managerId: Id,
  branchId: Id,
  month: string,
): TeamExportRow[] {
  return users
    .filter(
      (user) =>
        user.role === "associate" &&
        sameId(user.managerId, managerId) &&
        sameId(user.branchId, branchId),
    )
    .map((user) => {
      const completed = days.filter(
        (day) =>
          sameId(day.userId, user._id) &&
          day.status === "completed" &&
          day.localDate.startsWith(month),
      );
      return {
        name: user.name,
        email: user.email,
        daysWorked: completed.length,
        distanceKm:
          Math.round(
            completed.reduce(
              (total, day) => total + (day.totalDistanceKm ?? 0),
              0,
            ) * 10,
          ) / 10,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function teamExportPipeline(
  managerId: ObjectId,
  branchId: ObjectId,
  month: string,
): Document[] {
  return [
    {
      $match: {
        role: "associate",
        managerId,
        branchId,
      },
    },
    {
      $lookup: {
        from: "days",
        let: { associateId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$associateId"] },
              status: "completed",
              localDate: { $gte: `${month}-01`, $lte: `${month}-31` },
            },
          },
        ],
        as: "completedDays",
      },
    },
    {
      $project: {
        _id: 0,
        name: 1,
        email: 1,
        daysWorked: { $size: "$completedDays" },
        distanceKm: {
          $round: [{ $sum: "$completedDays.totalDistanceKm" }, 1],
        },
      },
    },
    { $sort: { name: 1 } },
  ];
}
