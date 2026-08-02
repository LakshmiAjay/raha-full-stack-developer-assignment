import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoUsers } from "@/lib/demo";
export async function GET(request: Request) {
  const s = await requireSession("head");
  if (!s) return unauthorized();
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month))
    return new Response("Invalid month", { status: 400 });
  let rows: {
    name: unknown;
    email: unknown;
    daysWorked: unknown;
    distanceKm: unknown;
  }[];
  if (demoEnabled()) {
    rows = demoUsers
      .filter((u) => u.role === "associate" && u.managerId === s.userId)
      .map((u) => {
        const days = demoDays().filter(
          (d) =>
            d.userId === u._id &&
            d.status === "completed" &&
            d.localDate.startsWith(month),
        );
        return {
          name: u.name,
          email: u.email,
          daysWorked: days.length,
          distanceKm:
            Math.round(
              days.reduce((n, d) => n + (d.totalDistanceKm || 0), 0) * 10,
            ) / 10,
        };
      });
  } else {
    const database = await db();
    rows = (await database
      .collection("days")
      .aggregate([
        {
          $match: {
            branchId: new ObjectId(s.branchId),
            status: "completed",
            localDate: { $gte: `${month}-01`, $lte: `${month}-31` },
          },
        },
        {
          $group: {
            _id: "$userId",
            daysWorked: { $sum: 1 },
            distanceKm: { $sum: "$totalDistanceKm" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 0,
            name: "$user.name",
            email: "$user.email",
            daysWorked: 1,
            distanceKm: { $round: ["$distanceKm", 1] },
          },
        },
        { $sort: { name: 1 } },
      ])
      .toArray()) as typeof rows;
  }
  const csv = [
    "Associate,Email,Sessions worked,Distance (km)",
    ...rows.map((r) =>
      [r.name, r.email, r.daysWorked, r.distanceKm]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="raha-distance-${month}.csv"`,
    },
  });
}
